export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 50;
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
