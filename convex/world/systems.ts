import type { MutationCtx, QueryCtx } from "../_generated/server";
import { RESOURCES, BUILDING_DECAY_RATE, BUILDING_BONUS, getRegionName } from "../lib/constants";

/** Check if a building of the given type is within bonus range of a position */
export async function hasBuildingBonus(
  ctx: QueryCtx | MutationCtx,
  position: { x: number; y: number },
  buildingType: keyof typeof BUILDING_BONUS,
): Promise<boolean> {
  const range = BUILDING_BONUS[buildingType].range;
  if (range === 0) return false;
  const buildings = await ctx.db.query("buildings").collect();
  return buildings.some(
    (b) =>
      b.type === buildingType &&
      b.condition > 0 &&
      Math.abs(b.posX - position.x) <= range &&
      Math.abs(b.posY - position.y) <= range,
  );
}

const WEATHER_TRANSITIONS: Record<string, Array<{ next: string; weight: number }>> = {
  clear: [
    { next: "clear", weight: 0.7 },
    { next: "rain", weight: 0.2 },
    { next: "fog", weight: 0.1 },
  ],
  rain: [
    { next: "rain", weight: 0.5 },
    { next: "clear", weight: 0.3 },
    { next: "storm", weight: 0.2 },
  ],
  storm: [
    { next: "storm", weight: 0.3 },
    { next: "rain", weight: 0.5 },
    { next: "clear", weight: 0.2 },
  ],
  fog: [
    { next: "fog", weight: 0.4 },
    { next: "clear", weight: 0.5 },
    { next: "rain", weight: 0.1 },
  ],
};

export function nextWeather(current: string, rand: () => number): string {
  const transitions = WEATHER_TRANSITIONS[current] ?? WEATHER_TRANSITIONS["clear"];
  let r = rand();
  for (const t of transitions) {
    r -= t.weight;
    if (r <= 0) return t.next;
  }
  return "clear";
}

export async function regenerateResources(ctx: MutationCtx): Promise<void> {
  const world = await ctx.db.query("worldState").first();
  const season = (world?.season ?? "spring") as keyof typeof RESOURCES.SEASON_MULTIPLIER;
  const multipliers = RESOURCES.SEASON_MULTIPLIER[season];

  const resources = await ctx.db.query("resources").collect();
  for (const r of resources) {
    if (r.quantity < r.maxQuantity) {
      const seasonMultiplier = multipliers[r.type as keyof typeof multipliers] ?? 1.0;
      const effectiveRate = r.regenRate * seasonMultiplier;
      const newQuantity = Math.round(Math.min(r.maxQuantity, r.quantity + effectiveRate) * 100) / 100;
      await ctx.db.patch(r._id, { quantity: newQuantity });
    }
  }
}

export async function applyBuildingEffects(ctx: MutationCtx): Promise<void> {
  const farms = await ctx.db
    .query("buildings")
    .collect()
    .then((b) => b.filter((x) => x.type === "farm" && x.condition > 0));

  for (const farm of farms) {
    const nearbyFood = await ctx.db
      .query("resources")
      .withIndex("by_position", (q) => q.eq("tileX", farm.posX).eq("tileY", farm.posY))
      .first();

    if (nearbyFood) {
      await ctx.db.patch(nearbyFood._id, {
        quantity: Math.min(nearbyFood.maxQuantity, nearbyFood.quantity + 1),
      });
    } else {
      await ctx.db.insert("resources", {
        tileX: farm.posX,
        tileY: farm.posY,
        type: "food",
        quantity: 1,
        maxQuantity: 10,
        regenRate: 0.5,
      });
    }
  }
}

export async function decayBuildings(ctx: MutationCtx): Promise<void> {
  const buildings = await ctx.db.query("buildings").collect();
  for (const b of buildings) {
    if (b.condition > 0) {
      await ctx.db.patch(b._id, {
        condition: Math.max(0, b.condition - BUILDING_DECAY_RATE),
      });
    }
  }
}

// --- Settlement Detection ---

export interface Settlement {
  name: string;
  region: string;
  buildings: Array<{ type: string; posX: number; posY: number }>;
  centerX: number;
  centerY: number;
}

const SETTLEMENT_CLUSTER_RADIUS = 8;

export async function detectSettlements(ctx: QueryCtx): Promise<Settlement[]> {
  const buildings = await ctx.db.query("buildings").collect();
  const active = buildings.filter((b) => b.condition > 0);
  if (active.length < 3) return [];

  const visited = new Set<string>();
  const settlements: Settlement[] = [];

  for (const building of active) {
    const key = `${building.posX},${building.posY}`;
    if (visited.has(key)) continue;

    // BFS to find cluster
    const cluster = [building];
    visited.add(key);
    const queue = [building];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const other of active) {
        const otherKey = `${other.posX},${other.posY}`;
        if (visited.has(otherKey)) continue;
        if (
          Math.abs(other.posX - current.posX) <= SETTLEMENT_CLUSTER_RADIUS &&
          Math.abs(other.posY - current.posY) <= SETTLEMENT_CLUSTER_RADIUS
        ) {
          visited.add(otherKey);
          cluster.push(other);
          queue.push(other);
        }
      }
    }

    if (cluster.length >= 3) {
      const centerX = Math.round(cluster.reduce((s, b) => s + b.posX, 0) / cluster.length);
      const centerY = Math.round(cluster.reduce((s, b) => s + b.posY, 0) / cluster.length);
      const region = getRegionName(centerX, centerY);

      settlements.push({
        name: `${region} Settlement`,
        region,
        buildings: cluster.map((b) => ({ type: b.type, posX: b.posX, posY: b.posY })),
        centerX,
        centerY,
      });
    }
  }

  return settlements;
}
