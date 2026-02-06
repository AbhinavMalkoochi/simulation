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

    for (const agent of agents) {
      if (agent.path && agent.path.length > 0) {
        const nextStep = agent.path[0];
        const remaining = agent.path.slice(1);
        await ctx.db.patch(agent._id, {
          position: nextStep,
          path: remaining.length > 0 ? remaining : undefined,
          targetPosition: remaining.length > 0 ? agent.targetPosition : undefined,
          status: remaining.length > 0 ? "moving" : "idle",
          energy: Math.max(0, agent.energy - 0.3),
        });
        continue;
      }

      if (agent.status === "sleeping") {
        const newEnergy = Math.min(100, agent.energy + 5);
        if (newEnergy >= 90) {
          await ctx.db.patch(agent._id, { energy: newEnergy, status: "idle" });
        } else {
          await ctx.db.patch(agent._id, { energy: newEnergy });
        }
        continue;
      }

      const shouldThink = newTick % 5 === (Math.abs(agent.spriteSeed) % 5);
      if (shouldThink && agent.status === "idle") {
        const jitterMs = Math.floor(rand() * 3000);
        await ctx.scheduler.runAfter(jitterMs, internal.agents.brain.think, {
          agentId: agent._id,
        });

        if (newTick % 20 === 0) {
          await ctx.scheduler.runAfter(jitterMs + 2000, internal.agents.brain.reflect, {
            agentId: agent._id,
          });
        }
        continue;
      }

      if (agent.status === "talking") {
        await ctx.db.patch(agent._id, { status: "idle" });
        continue;
      }

      if (agent.status === "idle" && !shouldThink) {
        const shouldWander = rand() > 0.6;
        if (!shouldWander) continue;

        const radius = 3 + Math.floor(rand() * 4);
        let targetX: number, targetY: number;
        let attempts = 0;
        do {
          targetX = Math.floor(agent.position.x + (rand() - 0.5) * radius * 2);
          targetY = Math.floor(agent.position.y + (rand() - 0.5) * radius * 2);
          attempts++;
        } while (
          !isWalkable(targetX, targetY, mapTiles, world.mapWidth, world.mapHeight) &&
          attempts < 8
        );
        if (attempts >= 8) continue;

        const path = findPath(agent.position, { x: targetX, y: targetY }, mapTiles, world.mapWidth, world.mapHeight);
        if (path.length > 1) {
          await ctx.db.patch(agent._id, {
            position: path[1],
            path: path.length > 2 ? path.slice(2) : undefined,
            targetPosition: path.length > 2 ? { x: targetX, y: targetY } : undefined,
            status: path.length > 2 ? "moving" : "idle",
            energy: Math.max(0, agent.energy - 0.3),
          });
        }
      }
    }

    if (newTick % 20 === 0) {
      await ctx.db.insert("worldEvents", {
        type: "tick_summary",
        description: `Tick ${newTick} — ${formatTime(newTimeOfDay)}. ${agents.length} agents active.`,
        involvedAgentIds: [],
        tick: newTick,
      });
    }
  },
});

function formatTime(t: number): string {
  const h = Math.floor(t);
  const m = Math.floor((t % 1) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
