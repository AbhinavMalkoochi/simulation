import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateMap, isWalkable } from "../lib/mapgen";
import { findPath } from "./pathfinding";
import { nextWeather, regenerateResources, applyBuildingEffects } from "../world/systems";

function seededRandom(seed: number): () => number {
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
    const rand = seededRandom(newTick + world.mapSeed);
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
        // Close any active conversations this agent is in
        const activeConvs = await ctx.db.query("conversations").order("desc").take(10);
        for (const conv of activeConvs) {
          if (!conv.endTick && conv.participantIds.includes(agent._id)) {
            await ctx.db.patch(conv._id, { endTick: newTick });
          }
        }
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

    // Resource regeneration every 5 ticks
    if (newTick % 5 === 0) {
      await regenerateResources(ctx);
    }

    // Weather transition every 10 ticks
    if (newTick % 10 === 0) {
      const newWeather = nextWeather(world.weather, rand);
      if (newWeather !== world.weather) {
        await ctx.db.patch(world._id, {
          weather: newWeather as "clear" | "rain" | "storm" | "fog",
        });
      }
    }

    // Building effects (farm food production) every 10 ticks
    if (newTick % 10 === 0) {
      await applyBuildingEffects(ctx);
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
