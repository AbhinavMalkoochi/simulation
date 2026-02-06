import type { MutationCtx } from "../_generated/server";

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
  const resources = await ctx.db.query("resources").collect();
  for (const r of resources) {
    if (r.quantity < r.maxQuantity) {
      const newQuantity = Math.min(r.maxQuantity, r.quantity + r.regenRate);
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
