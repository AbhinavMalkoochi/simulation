import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { generateMap, isWalkable } from "../lib/mapgen";
import { findPath } from "../engine/pathfinding";
import { addItem, removeItem, hasItems, getInventory, degradeItem, addItemWithDurability } from "../world/inventory";
import { findRecipe, BUILDING_COSTS } from "../world/recipes";
import { updateRelationship } from "../social/relationships";
import { ENERGY, DURABILITY } from "../lib/constants";

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

    // Conversations build small amounts of trust and affinity
    await updateRelationship(ctx, speakerId, target._id, 0.03, 0.05, tick);
    await updateRelationship(ctx, target._id, speakerId, 0.03, 0.05, tick);

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

export const gatherResource = internalMutation({
  args: {
    agentId: v.id("agents"),
    resourceType: v.union(
      v.literal("wood"),
      v.literal("stone"),
      v.literal("food"),
      v.literal("metal"),
      v.literal("herbs"),
    ),
  },
  handler: async (ctx, { agentId, resourceType }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return "Agent not found.";

    const resources = await ctx.db.query("resources").collect();
    const nearby = resources.find(
      (r) =>
        r.type === resourceType &&
        r.quantity > 0 &&
        Math.abs(r.tileX - agent.position.x) <= 2 &&
        Math.abs(r.tileY - agent.position.y) <= 2,
    );

    if (!nearby) return `No ${resourceType} nearby to gather.`;

    const gatherAmount = Math.min(nearby.quantity, 1 + Math.floor(agent.skills.gathering / 2));
    await ctx.db.patch(nearby._id, { quantity: nearby.quantity - gatherAmount });
    await addItem(ctx, agentId, resourceType, gatherAmount);

    await ctx.db.patch(agentId, {
      status: "working",
      energy: Math.max(0, agent.energy - ENERGY.GATHER_COST),
    });

    const world = await ctx.db.query("worldState").first();
    const tick = world?.tick ?? 0;

    await ctx.db.insert("worldEvents", {
      type: "gather",
      description: `${agent.name} gathered ${gatherAmount} ${resourceType}.`,
      involvedAgentIds: [agentId],
      tick,
    });

    return `Gathered ${gatherAmount} ${resourceType}. Energy: ${Math.max(0, agent.energy - ENERGY.GATHER_COST)}%.`;
  },
});

export const craftItem = internalMutation({
  args: {
    agentId: v.id("agents"),
    recipeName: v.string(),
  },
  handler: async (ctx, { agentId, recipeName }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return "Agent not found.";

    const recipe = findRecipe(recipeName);
    if (!recipe) return `Unknown recipe: ${recipeName}.`;

    const skillLevel = agent.skills[recipe.skillRequired as keyof typeof agent.skills] ?? 0;
    if (skillLevel < recipe.minSkillLevel) {
      return `Need ${recipe.skillRequired} level ${recipe.minSkillLevel}, you have ${skillLevel}.`;
    }

    const hasRequired = await hasItems(
      ctx,
      agentId,
      recipe.inputs,
    );
    if (!hasRequired) return "Not enough materials.";

    for (const input of recipe.inputs) {
      await removeItem(ctx, agentId, input.type, input.quantity);
    }
    await addItem(ctx, agentId, recipe.output.type, recipe.output.quantity);

    await ctx.db.patch(agentId, { status: "working", energy: Math.max(0, agent.energy - ENERGY.CRAFT_COST) });

    const world = await ctx.db.query("worldState").first();
    await ctx.db.insert("worldEvents", {
      type: "craft",
      description: `${agent.name} crafted ${recipe.output.quantity} ${recipe.output.type}.`,
      involvedAgentIds: [agentId],
      tick: world?.tick ?? 0,
    });

    return `Crafted ${recipe.output.quantity} ${recipe.output.type}.`;
  },
});

export const buildStructure = internalMutation({
  args: {
    agentId: v.id("agents"),
    buildingType: v.union(
      v.literal("shelter"),
      v.literal("workshop"),
      v.literal("market"),
      v.literal("meetingHall"),
      v.literal("farm"),
      v.literal("storehouse"),
    ),
  },
  handler: async (ctx, { agentId, buildingType }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return "Agent not found.";

    const cost = BUILDING_COSTS[buildingType];
    if (!cost) return `Unknown building type: ${buildingType}.`;

    const skillLevel = agent.skills[cost.skillRequired as keyof typeof agent.skills] ?? 0;
    if (skillLevel < cost.minSkillLevel) {
      return `Need ${cost.skillRequired} level ${cost.minSkillLevel}, you have ${skillLevel}.`;
    }

    const hasRequired = await hasItems(ctx, agentId, cost.resources);
    if (!hasRequired) return "Not enough materials to build.";

    const existing = await ctx.db
      .query("buildings")
      .withIndex("by_position", (q) =>
        q.eq("posX", agent.position.x).eq("posY", agent.position.y),
      )
      .first();
    if (existing) return "There is already a building here.";

    for (const input of cost.resources) {
      await removeItem(ctx, agentId, input.type, input.quantity);
    }

    await ctx.db.insert("buildings", {
      type: buildingType,
      posX: agent.position.x,
      posY: agent.position.y,
      ownerId: agentId,
      condition: 100,
      level: 1,
    });

    await ctx.db.patch(agentId, { status: "working", energy: Math.max(0, agent.energy - ENERGY.BUILD_COST) });

    const world = await ctx.db.query("worldState").first();
    await ctx.db.insert("worldEvents", {
      type: "build",
      description: `${agent.name} built a ${buildingType} at (${agent.position.x}, ${agent.position.y}).`,
      involvedAgentIds: [agentId],
      tick: world?.tick ?? 0,
    });

    return `Built a ${buildingType} at your location.`;
  },
});

export const giveItem = internalMutation({
  args: {
    agentId: v.id("agents"),
    targetName: v.string(),
    itemType: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, { agentId, targetName, itemType, quantity }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return "Agent not found.";

    const allAgents = await ctx.db.query("agents").collect();
    const target = allAgents.find(
      (a) =>
        a.name.toLowerCase() === targetName.toLowerCase() &&
        Math.abs(a.position.x - agent.position.x) <= 3 &&
        Math.abs(a.position.y - agent.position.y) <= 3,
    );
    if (!target) return `${targetName} is not nearby.`;

    const removed = await removeItem(ctx, agentId, itemType, quantity);
    if (!removed) return `You don't have ${quantity} ${itemType}.`;

    await addItem(ctx, target._id, itemType, quantity);

    const world = await ctx.db.query("worldState").first();
    const tick = world?.tick ?? 0;

    await updateRelationship(ctx, agentId, target._id, 0.1, 0.12, tick);
    await updateRelationship(ctx, target._id, agentId, 0.15, 0.1, tick);

    await ctx.db.insert("memories", {
      agentId: target._id,
      type: "observation",
      content: `${agent.name} gave me ${quantity} ${itemType}.`,
      importance: 6,
      tick,
    });

    await ctx.db.insert("worldEvents", {
      type: "gift",
      description: `${agent.name} gave ${quantity} ${itemType} to ${target.name}.`,
      involvedAgentIds: [agentId, target._id],
      tick,
    });

    return `Gave ${quantity} ${itemType} to ${target.name}.`;
  },
});

export const eatFood = internalMutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return "Agent not found.";

    let removed = await removeItem(ctx, agentId, "meal", 1);
    let energyGain = ENERGY.EAT_MEAL;

    if (!removed) {
      removed = await removeItem(ctx, agentId, "food", 1);
      energyGain = ENERGY.EAT_FOOD;
    }

    if (!removed) return "You have no food or meals.";

    await ctx.db.patch(agentId, {
      energy: Math.min(100, agent.energy + energyGain),
    });

    return `Ate and recovered ${energyGain} energy. Now at ${Math.min(100, agent.energy + energyGain)}%.`;
  },
});

export const checkInventory = internalMutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const items = await getInventory(ctx, agentId);
    if (items.length === 0) return "Your inventory is empty.";
    return "Inventory: " + items.map((i) => `${i.quantity} ${i.itemType}`).join(", ") + ".";
  },
});

// --- Building Repair (Tier 2) ---

export const repairBuilding = internalMutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return "Agent not found.";

    const building = await ctx.db
      .query("buildings")
      .withIndex("by_position", (q) => q.eq("posX", agent.position.x).eq("posY", agent.position.y))
      .first();

    if (!building) return "No building at your location.";
    if (building.condition >= 100) return "Building is already in perfect condition.";

    const repairCost = [{ type: "wood", quantity: 2 }, { type: "stone", quantity: 1 }];
    const hasMaterials = await hasItems(ctx, agentId, repairCost);
    if (!hasMaterials) return "Need 2 wood + 1 stone to repair.";

    for (const item of repairCost) {
      await removeItem(ctx, agentId, item.type, item.quantity);
    }

    const newCondition = Math.min(100, building.condition + 20);
    await ctx.db.patch(building._id, { condition: newCondition });
    await ctx.db.patch(agentId, { status: "working", energy: Math.max(0, agent.energy - 5) });

    return `Repaired ${building.type} to ${newCondition}% condition.`;
  },
});

// --- Sightings (Tier 1) ---

export const updateSightings = internalMutation({
  args: {
    agentId: v.id("agents"),
    sightings: v.array(v.object({
      targetId: v.id("agents"),
      position: v.object({ x: v.number(), y: v.number() }),
    })),
    tick: v.number(),
  },
  handler: async (ctx, { agentId, sightings, tick }) => {
    for (const { targetId, position } of sightings) {
      const existing = await ctx.db
        .query("relationships")
        .withIndex("by_pair", (q) => q.eq("agentId", agentId).eq("targetAgentId", targetId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { lastSeenPosition: position, lastSeenTick: tick });
      } else {
        await ctx.db.insert("relationships", {
          agentId,
          targetAgentId: targetId,
          trust: 0,
          affinity: 0,
          interactionCount: 0,
          lastInteractionTick: tick,
          lastSeenPosition: position,
          lastSeenTick: tick,
        });
      }
    }
  },
});

// --- Seek Agent (Tier 1) ---

export const seekAgentAction = internalMutation({
  args: {
    agentId: v.id("agents"),
    targetName: v.string(),
  },
  handler: async (ctx, { agentId, targetName }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return "Agent not found.";

    const allAgents = await ctx.db.query("agents").collect();
    const target = allAgents.find(
      (a) => a.name.toLowerCase() === targetName.toLowerCase() && a._id !== agentId,
    );
    if (!target) return `No one named ${targetName} exists.`;

    // If target is within perception range, pathfind directly
    const dx = Math.abs(target.position.x - agent.position.x);
    const dy = Math.abs(target.position.y - agent.position.y);
    if (dx <= 6 && dy <= 6) {
      // Target visible — move adjacent to them
      const world = await ctx.db.query("worldState").first();
      if (!world) return "World not found.";
      const mapTiles = generateMap(world.mapSeed, world.mapWidth, world.mapHeight);
      const path = findPath(agent.position, target.position, mapTiles, world.mapWidth, world.mapHeight);
      if (path.length < 2) return `Can't reach ${targetName} from here.`;
      await ctx.db.patch(agentId, {
        targetPosition: target.position,
        path: path.slice(1),
        status: "moving",
      });
      return `${targetName} is nearby! Moving toward them (${path.length - 1} steps).`;
    }

    // Check last known location from relationship
    const relationship = await ctx.db
      .query("relationships")
      .withIndex("by_pair", (q) => q.eq("agentId", agentId).eq("targetAgentId", target._id))
      .first();

    if (relationship?.lastSeenPosition) {
      const world = await ctx.db.query("worldState").first();
      if (!world) return "World not found.";
      const mapTiles = generateMap(world.mapSeed, world.mapWidth, world.mapHeight);
      const path = findPath(agent.position, relationship.lastSeenPosition, mapTiles, world.mapWidth, world.mapHeight);
      if (path.length < 2) return `Can't find a path to ${targetName}'s last known location.`;
      await ctx.db.patch(agentId, {
        targetPosition: relationship.lastSeenPosition,
        path: path.slice(1),
        status: "moving",
      });
      const ticksAgo = relationship.lastSeenTick
        ? (await ctx.db.query("worldState").first())?.tick ?? 0 - relationship.lastSeenTick
        : "unknown";
      return `Heading to ${targetName}'s last known location at (${relationship.lastSeenPosition.x}, ${relationship.lastSeenPosition.y}), last seen ${ticksAgo} ticks ago.`;
    }

    return `You don't know where ${targetName} is. Try exploring to find them.`;
  },
});

// --- Plan Lock (Tier 1) ---

export const commitToPlan = internalMutation({
  args: {
    agentId: v.id("agents"),
    plan: v.string(),
    steps: v.array(v.string()),
    tick: v.number(),
  },
  handler: async (ctx, { agentId, plan, steps, tick }) => {
    if (steps.length === 0) return "Plan must have at least one step.";

    await ctx.db.patch(agentId, {
      currentPlan: `Step 1/${steps.length}: ${steps[0]}`,
      planSteps: steps,
      planStep: 0,
      planStartTick: tick,
    });

    await ctx.db.insert("memories", {
      agentId,
      type: "plan",
      content: `Committed to plan: ${plan} (${steps.length} steps)`,
      importance: 6,
      tick,
    });

    return `Plan committed with ${steps.length} steps. Starting step 1: ${steps[0]}`;
  },
});

export const advancePlanStep = internalMutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return "Agent not found.";
    if (!agent.planSteps || agent.planStep === undefined) return "No active plan.";

    const nextStep = agent.planStep + 1;
    if (nextStep >= agent.planSteps.length) {
      // Plan complete
      await ctx.db.patch(agentId, {
        currentPlan: undefined,
        planSteps: undefined,
        planStep: undefined,
        planStartTick: undefined,
      });

      const world = await ctx.db.query("worldState").first();
      await ctx.db.insert("memories", {
        agentId,
        type: "observation",
        content: "I completed my entire plan successfully!",
        importance: 5,
        tick: world?.tick ?? 0,
      });

      return "Plan completed!";
    }

    await ctx.db.patch(agentId, {
      planStep: nextStep,
      currentPlan: `Step ${nextStep + 1}/${agent.planSteps.length}: ${agent.planSteps[nextStep]}`,
    });

    return `Advanced to step ${nextStep + 1}: ${agent.planSteps[nextStep]}`;
  },
});

export const abandonPlan = internalMutation({
  args: {
    agentId: v.id("agents"),
    reason: v.string(),
    tick: v.number(),
  },
  handler: async (ctx, { agentId, reason, tick }) => {
    await ctx.db.patch(agentId, {
      currentPlan: undefined,
      planSteps: undefined,
      planStep: undefined,
      planStartTick: undefined,
    });

    await ctx.db.insert("memories", {
      agentId,
      type: "observation",
      content: `I abandoned my plan because: ${reason}`,
      importance: 4,
      tick,
    });

    return "Plan abandoned.";
  },
});
