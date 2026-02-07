import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateMap, isWalkable } from "../lib/mapgen";
import { seededRandom, formatTime } from "../lib/utils";
import { findPath } from "./pathfinding";
import { nextWeather, regenerateResources, applyBuildingEffects, decayBuildings, hasBuildingBonus } from "../world/systems";
import { ENERGY } from "../lib/constants";

export const run = internalMutation({
  handler: async (ctx) => {
    const world = await ctx.db.query("worldState").first();
    if (!world || world.paused) return;

    const newTick = world.tick + 1;
    const newTimeOfDay = (world.timeOfDay + 0.125) % 24;

    await ctx.db.patch(world._id, {
      tick: newTick,
      timeOfDay: newTimeOfDay,
    });

    const mapTiles = generateMap(world.mapSeed, world.mapWidth, world.mapHeight);
    const rand = seededRandom(newTick + world.mapSeed);
    const agents = await ctx.db.query("agents").collect();

    // Build a set of agent IDs currently in active (open) conversations
    const openConvs = await ctx.db.query("conversations").order("desc").take(50);
    const conversingAgentIds = new Set<string>();
    for (const conv of openConvs) {
      if (conv.endTick) continue;
      for (const pid of conv.participantIds) {
        conversingAgentIds.add(String(pid));
      }
    }

    for (const agent of agents) {
      const isConversing = conversingAgentIds.has(String(agent._id));

      // Agents in active conversations stay put — no movement
      if (isConversing && agent.path && agent.path.length > 0) {
        await ctx.db.patch(agent._id, {
          path: undefined,
          targetPosition: undefined,
          status: "talking",
        });
        continue;
      }

      if (agent.path && agent.path.length > 0) {
        const nextStep = agent.path[0];
        const remaining = agent.path.slice(1);
        await ctx.db.patch(agent._id, {
          position: nextStep,
          path: remaining.length > 0 ? remaining : undefined,
          targetPosition: remaining.length > 0 ? agent.targetPosition : undefined,
          status: remaining.length > 0 ? "moving" : "idle",
          energy: Math.max(0, agent.energy - ENERGY.MOVEMENT_COST),
        });
        continue;
      }

      if (agent.status === "sleeping") {
        const nearShelter = await hasBuildingBonus(ctx, agent.position, "shelter");
        const regenRate = ENERGY.SLEEP_REGEN + (nearShelter ? ENERGY.SHELTER_BONUS_REGEN : 0);
        const newEnergy = Math.min(100, agent.energy + regenRate);
        if (newEnergy >= 90) {
          await ctx.db.patch(agent._id, { energy: newEnergy, status: "idle" });
        } else {
          await ctx.db.patch(agent._id, { energy: newEnergy });
        }
        continue;
      }

      // Passive energy drain for all non-sleeping agents (hunger)
      const drainedEnergy = Math.max(0, agent.energy - ENERGY.PASSIVE_DRAIN);

      // Starvation effects: mood deterioration when critically low
      if (drainedEnergy < ENERGY.STARVATION_THRESHOLD && drainedEnergy > 0) {
        await ctx.db.patch(agent._id, {
          energy: drainedEnergy,
          emotion: {
            valence: Math.max(-1, agent.emotion.valence - 0.05),
            arousal: Math.min(1, agent.emotion.arousal + 0.03),
          },
        });
      } else if (drainedEnergy !== agent.energy) {
        await ctx.db.patch(agent._id, { energy: drainedEnergy });
      }

      // Auto-rest when critically low on energy
      if (drainedEnergy < ENERGY.CRITICAL_THRESHOLD) {
        await ctx.db.patch(agent._id, {
          energy: Math.min(100, drainedEnergy + 15),
          status: "sleeping",
          path: undefined,
          targetPosition: undefined,
        });
        continue;
      }

      // Agents in active conversations hold position and stay in "talking" status
      if (isConversing) {
        if (agent.status !== "talking") {
          await ctx.db.patch(agent._id, { status: "talking" });
        }
        continue;
      }

      // Reset talking status to idle once conversation has ended
      if (agent.status === "talking") {
        await ctx.db.patch(agent._id, { status: "idle" });
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

      if (agent.status === "idle" && !shouldThink) {
        // Don't wander if agent has a locked plan — let the think cycle drive movement
        if (agent.planSteps && agent.planStep !== undefined) continue;

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
            energy: Math.max(0, agent.energy - ENERGY.MOVEMENT_COST),
          });
        }
      }
    }

    // Close stale conversations (no new messages for 10+ ticks)
    if (newTick % 5 === 0) {
      const openConvs = await ctx.db.query("conversations").order("desc").take(20);
      for (const conv of openConvs) {
        if (conv.endTick) continue;
        const lastMsgTick = conv.messages.length > 0
          ? conv.messages[conv.messages.length - 1].tick
          : conv.startTick;
        if (newTick - lastMsgTick >= 10) {
          await ctx.db.patch(conv._id, { endTick: newTick });
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

    // Building decay every 20 ticks
    if (newTick % 20 === 0) {
      await decayBuildings(ctx);
    }

    // Day transition: generate day summaries when midnight passes
    const TICKS_PER_DAY = 192;
    if (newTimeOfDay < world.timeOfDay && newTick > TICKS_PER_DAY) {
      const completedDay = Math.floor((newTick - 1) / TICKS_PER_DAY);

      // Generate per-agent day summaries
      for (const agent of agents) {
        await ctx.scheduler.runAfter(
          Math.floor(Math.random() * 5000),
          internal.agents.brain.generateDaySummary,
          { agentId: agent._id, day: completedDay, tick: newTick },
        );
      }

      // Generate global world day summary (delayed to give events time to settle)
      await ctx.scheduler.runAfter(
        8000,
        internal.analytics.dailySummary.generateWorldDaySummary,
        { day: completedDay, tick: newTick },
      );

      await ctx.db.insert("worldEvents", {
        type: "god_action",
        description: `A new day dawns. Day ${completedDay + 1} begins.`,
        involvedAgentIds: [],
        tick: newTick,
      });
    }

    // Season transition every 768 ticks (~4 in-game days at 192 ticks/day)
    if (newTick % 768 === 0 && newTick > 0) {
      const SEASON_ORDER = ["spring", "summer", "autumn", "winter"] as const;
      const currentIdx = SEASON_ORDER.indexOf(world.season);
      const nextSeason = SEASON_ORDER[(currentIdx + 1) % 4];
      await ctx.db.patch(world._id, { season: nextSeason });
      await ctx.db.insert("worldEvents", {
        type: "god_action",
        description: `The season has changed to ${nextSeason}.`,
        involvedAgentIds: [],
        tick: newTick,
      });
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

