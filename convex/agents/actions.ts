import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { generateMap, isWalkable } from "../lib/mapgen";
import { findPath } from "../engine/pathfinding";

export const moveAgent = internalMutation({
  args: {
    agentId: v.id("agents"),
    targetX: v.number(),
    targetY: v.number(),
  },
  handler: async (ctx, { agentId, targetX, targetY }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return "Agent not found.";

    const world = await ctx.db.query("worldState").first();
    if (!world) return "World not found.";

    const mapTiles = generateMap(world.mapSeed, world.mapWidth, world.mapHeight);
    if (!isWalkable(targetX, targetY, mapTiles, world.mapWidth, world.mapHeight)) {
      return "That location is not walkable.";
    }

    const path = findPath(
      agent.position,
      { x: targetX, y: targetY },
      mapTiles,
      world.mapWidth,
      world.mapHeight,
    );

    if (path.length < 2) return "No path found to that location.";

    await ctx.db.patch(agentId, {
      targetPosition: { x: targetX, y: targetY },
      path: path.slice(1),
      status: "moving",
    });

    return `Path found (${path.length - 1} steps). Moving to (${targetX}, ${targetY}).`;
  },
});

export const speakTo = internalMutation({
  args: {
    speakerId: v.id("agents"),
    targetName: v.string(),
    message: v.string(),
  },
  handler: async (ctx, { speakerId, targetName, message }) => {
    const speaker = await ctx.db.get(speakerId);
    if (!speaker) return "Speaker not found.";

    const allAgents = await ctx.db.query("agents").collect();
    const target = allAgents.find(
      (a) =>
        a.name.toLowerCase() === targetName.toLowerCase() &&
        Math.abs(a.position.x - speaker.position.x) <= 6 &&
        Math.abs(a.position.y - speaker.position.y) <= 6,
    );

    if (!target) return `${targetName} is not nearby.`;

    const world = await ctx.db.query("worldState").first();
    const tick = world?.tick ?? 0;

    const existing = await ctx.db.query("conversations").order("desc").take(10);
    const activeConv = existing.find(
      (c) =>
        !c.endTick &&
        c.participantIds.includes(speakerId) &&
        c.participantIds.includes(target._id),
    );

    if (activeConv) {
      await ctx.db.patch(activeConv._id, {
        messages: [
          ...activeConv.messages,
          { speakerId, content: message, tick },
        ],
      });
    } else {
      await ctx.db.insert("conversations", {
        participantIds: [speakerId, target._id],
        messages: [{ speakerId, content: message, tick }],
        startTick: tick,
      });
    }

    await ctx.db.patch(speakerId, { status: "talking" });

    await ctx.db.insert("memories", {
      agentId: target._id,
      type: "conversation",
      content: `${speaker.name} said to me: "${message}"`,
      importance: 5,
      tick,
    });

    await ctx.db.insert("worldEvents", {
      type: "conversation",
      description: `${speaker.name} said to ${target.name}: "${message}"`,
      involvedAgentIds: [speakerId, target._id],
      tick,
    });

    return `You said "${message}" to ${target.name}.`;
  },
});

export const restAgent = internalMutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return "Agent not found.";

    const newEnergy = Math.min(100, agent.energy + 15);
    await ctx.db.patch(agentId, {
      energy: newEnergy,
      status: "sleeping",
    });

    return `Resting. Energy recovered to ${newEnergy}%.`;
  },
});

export const recordThought = internalMutation({
  args: {
    agentId: v.id("agents"),
    thought: v.string(),
    tick: v.number(),
  },
  handler: async (ctx, { agentId, thought, tick }) => {
    await ctx.db.insert("memories", {
      agentId,
      type: "observation",
      content: thought,
      importance: 3,
      tick,
    });
    return "Thought recorded.";
  },
});

export const updatePlan = internalMutation({
  args: {
    agentId: v.id("agents"),
    plan: v.string(),
    tick: v.number(),
  },
  handler: async (ctx, { agentId, plan, tick }) => {
    await ctx.db.patch(agentId, { currentPlan: plan });
    await ctx.db.insert("memories", {
      agentId,
      type: "plan",
      content: plan,
      importance: 4,
      tick,
    });
    return "Plan updated.";
  },
});

export const storeReflections = internalMutation({
  args: {
    agentId: v.id("agents"),
    reflections: v.array(v.string()),
    tick: v.number(),
  },
  handler: async (ctx, { agentId, reflections, tick }) => {
    for (const content of reflections) {
      await ctx.db.insert("memories", {
        agentId,
        type: "reflection",
        content,
        importance: 8,
        tick,
      });
    }
  },
});

export const updateEmotion = internalMutation({
  args: {
    agentId: v.id("agents"),
    valence: v.number(),
    arousal: v.number(),
  },
  handler: async (ctx, { agentId, valence, arousal }) => {
    await ctx.db.patch(agentId, {
      emotion: {
        valence: Math.max(-1, Math.min(1, valence)),
        arousal: Math.max(0, Math.min(1, arousal)),
      },
    });
  },
});
