export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 80;
export const MAP_SEED = 42;
export const TILE_SIZE = 32;

export const TILE = {
  WATER: 0,
  SAND: 1,
  GRASS: 2,
  FOREST: 3,
  STONE: 4,
} as const;

export type TileType = (typeof TILE)[keyof typeof TILE];

export const TILE_WALKABLE: Record<number, boolean> = {
  [TILE.WATER]: false,
  [TILE.SAND]: true,
  [TILE.GRASS]: true,
  [TILE.FOREST]: false,
  [TILE.STONE]: true,
};

export const TILE_COLORS: Record<number, number> = {
  [TILE.WATER]: 0x2563eb,
  [TILE.SAND]: 0xd4a574,
  [TILE.GRASS]: 0x4ade80,
  [TILE.FOREST]: 0x166534,
  [TILE.STONE]: 0x78716c,
};

export const AGENT_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6,
  0x1abc9c, 0xe67e22, 0xf1c40f, 0x00bcd4, 0xff6b81,
];

// --- Tier 2: Energy & scarcity ---

export const ENERGY = {
  PASSIVE_DRAIN: 0.4,
  MOVEMENT_COST: 0.5,
  GATHER_COST: 5,
  CRAFT_COST: 7,
  BUILD_COST: 12,
  STARVATION_THRESHOLD: 15,
  CRITICAL_THRESHOLD: 5,
  SLEEP_REGEN: 5,
  SHELTER_BONUS_REGEN: 3,
  EAT_MEAL: 25,
  EAT_FOOD: 10,
} as const;

export const RESOURCES = {
  SPAWN_CHANCE: { wood: 0.10, stone: 0.10, food: 0.03, herbs: 0.03, metal: 0.02 },
  SEASON_MULTIPLIER: {
    spring: { food: 1.2, herbs: 1.2, wood: 1.0, stone: 1.0, metal: 1.0 },
    summer: { food: 1.5, herbs: 1.0, wood: 1.0, stone: 1.0, metal: 1.0 },
    autumn: { food: 0.7, herbs: 0.5, wood: 1.2, stone: 1.0, metal: 1.0 },
    winter: { food: 0.2, herbs: 0.1, wood: 0.8, stone: 1.0, metal: 1.0 },
  },
} as const;

export const DURABILITY = {
  stone_tools: 10,
  metal_tools: 25,
} as const;

export const BUILDING_BONUS = {
  shelter: { range: 2, sleepBonus: 3 },
  workshop: { range: 2, craftEnergySave: 2, extraOutput: 1 },
  market: { range: 4, tradeRangeBoost: 12 },
  storehouse: { range: 2 },
  meetingHall: { range: 3, voteWeight: 1 },
  farm: { range: 0 },
} as const;

export const BUILDING_DECAY_RATE = 1;
export const BUILDING_DECAY_INTERVAL = 20;

// --- Perception ---

export const PERCEPTION = {
  AGENT_RANGE: 6,
  RESOURCE_RANGE: 4,
  BUILDING_RANGE: 5,
  SPEAK_RANGE: 6,
  GIVE_RANGE: 3,
  GATHER_RANGE: 2,
} as const;

// --- Named Map Regions ---

export interface MapRegion {
  readonly name: string;
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

export const MAP_REGIONS: readonly MapRegion[] = [
  { name: "Northshore Beach", xMin: 0, xMax: 19, yMin: 0, yMax: 19 },
  { name: "Pine Hollow", xMin: 20, xMax: 39, yMin: 0, yMax: 19 },
  { name: "Iron Summit", xMin: 40, xMax: 59, yMin: 0, yMax: 19 },
  { name: "Eastern Cliffs", xMin: 60, xMax: 79, yMin: 0, yMax: 19 },
  { name: "Whispering Meadow", xMin: 0, xMax: 19, yMin: 20, yMax: 39 },
  { name: "Hearthstone Valley", xMin: 20, xMax: 39, yMin: 20, yMax: 39 },
  { name: "Granite Pass", xMin: 40, xMax: 59, yMin: 20, yMax: 39 },
  { name: "Duskwood Edge", xMin: 60, xMax: 79, yMin: 20, yMax: 39 },
  { name: "Sunlit Grove", xMin: 0, xMax: 19, yMin: 40, yMax: 59 },
  { name: "Clearwater Basin", xMin: 20, xMax: 39, yMin: 40, yMax: 59 },
  { name: "Stonehearth Plateau", xMin: 40, xMax: 59, yMin: 40, yMax: 59 },
  { name: "Windbreak Ridge", xMin: 60, xMax: 79, yMin: 40, yMax: 59 },
  { name: "Ferndale Lowlands", xMin: 0, xMax: 19, yMin: 60, yMax: 79 },
  { name: "Riverbend Crossing", xMin: 20, xMax: 39, yMin: 60, yMax: 79 },
  { name: "Ashfall Quarry", xMin: 40, xMax: 59, yMin: 60, yMax: 79 },
  { name: "Farwatch Outpost", xMin: 60, xMax: 79, yMin: 60, yMax: 79 },
] as const;

export function getRegionName(x: number, y: number): string {
  for (const r of MAP_REGIONS) {
    if (x >= r.xMin && x <= r.xMax && y >= r.yMin && y <= r.yMax) return r.name;
  }
  return "the wilderness";
}

export function getRelativeDirection(
  fromX: number, fromY: number,
  toX: number, toY: number,
): string {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 2) return "right here";
  if (dist < 5) return "nearby";

  const parts: string[] = [];
  if (dy < -2) parts.push("north");
  else if (dy > 2) parts.push("south");
  if (dx > 2) parts.push("east");
  else if (dx < -2) parts.push("west");

  const dir = parts.join("-") || "nearby";
  if (dist < 10) return `a short walk to the ${dir}`;
  if (dist < 25) return `to the ${dir}`;
  return `far to the ${dir}`;
}

export function describeDistance(dist: number): string {
  if (dist < 2) return "right here";
  if (dist < 4) return "a few steps away";
  if (dist < 8) return "a short walk";
  if (dist < 15) return "a moderate walk";
  return "far away";
}
