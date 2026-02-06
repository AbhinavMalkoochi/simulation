import type { TileType } from "../lib/constants";
import { isWalkable } from "../lib/mapgen";

interface Position {
  x: number;
  y: number;
}

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function neighbors(pos: Position): Position[] {
  return [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 },
  ];
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

export function findPath(
  start: Position,
  goal: Position,
  mapTiles: TileType[],
  mapWidth: number,
  mapHeight: number,
  maxIterations = 500,
): Position[] {
  if (!isWalkable(goal.x, goal.y, mapTiles, mapWidth, mapHeight)) return [];
  if (start.x === goal.x && start.y === goal.y) return [start];

  const openSet = new Map<string, { pos: Position; f: number; g: number }>();
  const cameFrom = new Map<string, Position>();
  const gScore = new Map<string, number>();

  const sk = posKey(start);
  gScore.set(sk, 0);
  openSet.set(sk, { pos: start, f: heuristic(start, goal), g: 0 });

  let iterations = 0;

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;

    let bestKey = "";
    let bestF = Infinity;
    for (const [k, v] of openSet) {
      if (v.f < bestF) {
        bestF = v.f;
        bestKey = k;
      }
    }

    const current = openSet.get(bestKey)!;
    openSet.delete(bestKey);

    if (current.pos.x === goal.x && current.pos.y === goal.y) {
      const path: Position[] = [current.pos];
      let key = posKey(current.pos);
      while (cameFrom.has(key)) {
        const prev = cameFrom.get(key)!;
        path.unshift(prev);
        key = posKey(prev);
      }
      return path;
    }

    for (const neighbor of neighbors(current.pos)) {
      if (!isWalkable(neighbor.x, neighbor.y, mapTiles, mapWidth, mapHeight)) continue;

      const nk = posKey(neighbor);
      const tentativeG = current.g + 1;

      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current.pos);
        gScore.set(nk, tentativeG);
        openSet.set(nk, {
          pos: neighbor,
          f: tentativeG + heuristic(neighbor, goal),
          g: tentativeG,
        });
      }
    }
  }

  return [];
}
