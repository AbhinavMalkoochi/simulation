import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateMap, isWalkable } from "../lib/mapgen";
import { findPath } from "./pathfinding";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export const run = internalMutation({
  handler: async (ctx) => {
    const world = await ctx.db.query("worldState").first();
    if (!world || world.paused) return;

    const newTick = world.tick + 1;
    const newTimeOfDay = (world.timeOfDay + 0.5) % 24;

    await ctx.db.patch(world._id, {
      tick: newTick,
      timeOfDay: newTimeOfDay,
    });

    const mapTiles = generateMap(world.mapSeed, world.mapWidth, world.mapHeight);
    const agents = await ctx.db.query("agents").collect();
    const rand = seededRandom(world.mapSeed + newTick);

    for (const agent of agents) {
      const hasPath = agent.path && agent.path.length > 1;

      if (hasPath) {
        const nextStep = agent.path![1];
        const remainingPath = agent.path!.slice(1);
        await ctx.db.patch(agent._id, {
          position: nextStep,
          path: remainingPath.length > 1 ? remainingPath : undefined,
          targetPosition: remainingPath.length > 1 ? agent.targetPosition : undefined,
          status: remainingPath.length > 1 ? "moving" : "idle",
          energy: Math.max(0, agent.energy - 0.5),
        });
      } else {
        const shouldMove = rand() > 0.3;
        if (!shouldMove) continue;

        const radius = 5 + Math.floor(rand() * 6);
        let targetX: number, targetY: number;
        let attempts = 0;
        do {
          targetX = Math.floor(agent.position.x + (rand() - 0.5) * radius * 2);
          targetY = Math.floor(agent.position.y + (rand() - 0.5) * radius * 2);
          attempts++;
        } while (
          !isWalkable(targetX, targetY, mapTiles, world.mapWidth, world.mapHeight) &&
          attempts < 10
        );

        if (attempts >= 10) continue;

        const path = findPath(
          agent.position,
          { x: targetX, y: targetY },
          mapTiles,
          world.mapWidth,
          world.mapHeight,
        );

        if (path.length > 1) {
          await ctx.db.patch(agent._id, {
            position: path[1],
            path: path.length > 2 ? path.slice(1) : undefined,
            targetPosition: path.length > 2 ? { x: targetX, y: targetY } : undefined,
            status: path.length > 2 ? "moving" : "idle",
            energy: Math.max(0, agent.energy - 0.5),
          });
        }
      }
    }

    if (newTick % 10 === 0) {
      await ctx.db.insert("worldEvents", {
        type: "tick_summary",
        description: `Tick ${newTick}: Time is ${Math.floor(newTimeOfDay)}:${String(Math.floor((newTimeOfDay % 1) * 60)).padStart(2, "0")}. ${agents.length} agents active.`,
        involvedAgentIds: [],
        tick: newTick,
      });
    }
  },
});
