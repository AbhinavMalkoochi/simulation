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
