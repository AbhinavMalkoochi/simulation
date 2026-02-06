import { TILE, TILE_WALKABLE, type TileType } from "./constants";

function hash(ix: number, iy: number, seed: number): number {
  let h = seed + ix * 374761393 + iy * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number, scale: number): number {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const fx = sx - x0;
  const fy = sy - y0;

  const n00 = hash(x0, y0, seed);
  const n10 = hash(x0 + 1, y0, seed);
  const n01 = hash(x0, y0 + 1, seed);
  const n11 = hash(x0 + 1, y0 + 1, seed);

  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
}

export function generateMap(
  seed: number,
  width: number,
  height: number,
): TileType[] {
  const tiles: TileType[] = new Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const elevation =
        valueNoise(x, y, seed, 10) * 0.5 +
        valueNoise(x, y, seed + 1000, 5) * 0.35 +
        valueNoise(x, y, seed + 2000, 2) * 0.15;

      const moisture = valueNoise(x, y, seed + 5000, 8);

      let tile: TileType;
      if (elevation < 0.3) {
        tile = TILE.WATER;
      } else if (elevation < 0.36) {
        tile = TILE.SAND;
      } else if (elevation < 0.72) {
        tile = moisture > 0.55 ? TILE.FOREST : TILE.GRASS;
      } else {
        tile = TILE.STONE;
      }

      tiles[y * width + x] = tile;
    }
  }

  return tiles;
}

export function isWalkable(
  x: number,
  y: number,
  mapTiles: TileType[],
  width: number,
  height: number,
): boolean {
  if (x < 0 || x >= width || y < 0 || y >= height) return false;
  return TILE_WALKABLE[mapTiles[y * width + x]] ?? false;
}
