import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { tool } from "ai";
import { z } from "zod";
import { buildSystemPrompt, buildReflectionPrompt } from "./prompts";
import { scoreMemories } from "./memory";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

function buildTools(ctx: ActionCtx, agentId: Id<"agents">, tick: number) {
  return {
    moveTo: tool({
      description: "Move to a specific location. Choose coordinates based on what you see nearby or want to explore.",
      parameters: z.object({
        x: z.number().describe("Target x coordinate"),
        y: z.number().describe("Target y coordinate"),
      }),
      execute: async ({ x, y }) => {
        return ctx.runMutation(internal.agents.actions.moveAgent, {
          agentId,
          targetX: Math.round(x),
          targetY: Math.round(y),
        });
      },
    }),

    speak: tool({
      description: "Say something to a nearby person. They will hear you and may respond later.",
      parameters: z.object({
        targetName: z.string().describe("Name of the person to talk to"),
        message: z.string().describe("What you want to say"),
      }),
      execute: async ({ targetName, message }) => {
        return ctx.runMutation(internal.agents.actions.speakTo, {
          speakerId: agentId,
          targetName,
          message,
        });
      },
    }),

    rest: tool({
      description: "Rest and recover energy. Use when your energy is below 30%.",
      parameters: z.object({}),
      execute: async () => {
        return ctx.runMutation(internal.agents.actions.restAgent, { agentId });
      },
    }),

    think: tool({
      description: "Record a private thought or observation about your situation.",
      parameters: z.object({
        thought: z.string().describe("Your thought or observation"),
      }),
      execute: async ({ thought }) => {
        return ctx.runMutation(internal.agents.actions.recordThought, {
          agentId,
          thought,
          tick,
        });
      },
    }),

    setPlan: tool({
      description: "Set your current plan or goal. This helps you stay focused across time.",
      parameters: z.object({
        plan: z.string().describe("Your plan for the near future"),
      }),
      execute: async ({ plan }) => {
        return ctx.runMutation(internal.agents.actions.updatePlan, {
          agentId,
          plan,
          tick,
        });
      },
    }),

    gatherResource: tool({
      description: "Gather a resource from nearby tiles. Types: wood, stone, food, metal, herbs.",
      parameters: z.object({
        resourceType: z.string().describe("Type of resource to gather"),
      }),
      execute: async ({ resourceType }) => {
        return ctx.runMutation(internal.agents.actions.gatherResource, {
          agentId,
          resourceType,
        });
      },
    }),

    craft: tool({
      description: "Craft an item using resources in your inventory. Recipes: wooden_plank (3 wood), stone_tools (2 stone + 1 wood), meal (2 food), medicine (3 herbs), metal_tools (2 metal + 1 wood), rope (2 herbs + 1 wood).",
      parameters: z.object({
        recipeName: z.string().describe("Name of the recipe to craft"),
      }),
      execute: async ({ recipeName }) => {
        return ctx.runMutation(internal.agents.actions.craftItem, {
          agentId,
          recipeName,
        });
      },
    }),

    buildStructure: tool({
      description: "Build a structure at your current location. Types: shelter (5 wood + 3 stone), workshop (8 wood + 5 stone + 2 metal), market (10 wood + 8 stone), farm (4 wood + 2 stone), storehouse (6 wood + 4 stone).",
      parameters: z.object({
        buildingType: z.string().describe("Type of building to construct"),
      }),
      execute: async ({ buildingType }) => {
        return ctx.runMutation(internal.agents.actions.buildStructure, {
          agentId,
          buildingType,
        });
      },
    }),

    giveItem: tool({
      description: "Give an item from your inventory to a nearby person.",
      parameters: z.object({
        targetName: z.string().describe("Name of the person"),
        itemType: z.string().describe("Type of item to give"),
        quantity: z.number().describe("How many to give"),
      }),
      execute: async ({ targetName, itemType, quantity }) => {
        return ctx.runMutation(internal.agents.actions.giveItem, {
          agentId,
          targetName,
          itemType,
          quantity: Math.round(quantity),
        });
      },
    }),

    eat: tool({
      description: "Eat food from your inventory to recover energy. Meals give 25 energy, raw food gives 10.",
      parameters: z.object({}),
      execute: async () => {
        return ctx.runMutation(internal.agents.actions.eatFood, { agentId });
      },
    }),

    checkInventory: tool({
      description: "Check what items you are carrying.",
      parameters: z.object({}),
      execute: async () => {
        return ctx.runMutation(internal.agents.actions.checkInventory, { agentId });
      },
    }),

    explore: tool({
      description: "Move to a random area to discover new resources or meet people.",
      parameters: z.object({
        direction: z.enum(["north", "south", "east", "west"]).describe("General direction to explore"),
      }),
      execute: async ({ direction }) => {
        const offsets: Record<string, { dx: number; dy: number }> = {
          north: { dx: 0, dy: -8 },
          south: { dx: 0, dy: 8 },
          east: { dx: 8, dy: 0 },
          west: { dx: -8, dy: 0 },
        };
        const offset = offsets[direction] ?? offsets["north"];
        const agent = await ctx.runQuery(internal.agents.queries.getById, { agentId });
        if (!agent) return "Agent not found.";
        return ctx.runMutation(internal.agents.actions.moveAgent, {
          agentId,
          targetX: Math.max(0, Math.min(49, agent.position.x + offset.dx)),
          targetY: Math.max(0, Math.min(49, agent.position.y + offset.dy)),
        });
      },
    }),

    formAlliance: tool({
      description: "Found a new alliance/group with a name. You become the first member.",
      parameters: z.object({
        name: z.string().describe("Name for the alliance"),
      }),
      execute: async ({ name }) => {
        return ctx.runMutation(internal.social.alliances.create, { founderId: agentId, name });
      },
    }),

    inviteToAlliance: tool({
      description: "Invite a nearby person to join your alliance.",
      parameters: z.object({
        targetName: z.string().describe("Person to invite"),
        allianceName: z.string().describe("Alliance to invite them to"),
      }),
      execute: async ({ targetName, allianceName }) => {
        return ctx.runMutation(internal.social.alliances.invite, {
          inviterId: agentId,
          targetName,
          allianceName,
        });
      },
    }),

    proposeRule: tool({
      description: "Propose a new rule or norm for your alliance. Members will vote on it.",
      parameters: z.object({
        allianceName: z.string().describe("Alliance to propose the rule for"),
        rule: z.string().describe("The rule to propose"),
      }),
      execute: async ({ allianceName, rule }) => {
        return ctx.runMutation(internal.social.alliances.proposeRule, {
          proposerId: agentId,
          allianceName,
          content: rule,
        });
      },
    }),

    proposeTrade: tool({
      description: "Propose a trade to a nearby person. Offer items from your inventory in exchange for theirs.",
      parameters: z.object({
        targetName: z.string().describe("Person to trade with"),
        offerType: z.string().describe("Item type you are offering"),
        offerQuantity: z.number().describe("How many you are offering"),
        requestType: z.string().describe("Item type you want in return"),
        requestQuantity: z.number().describe("How many you want"),
      }),
      execute: async ({ targetName, offerType, offerQuantity, requestType, requestQuantity }) => {
        return ctx.runMutation(internal.social.trading.propose, {
          initiatorId: agentId,
          targetName,
          offerType,
          offerQty: Math.round(offerQuantity),
          requestType,
          requestQty: Math.round(requestQuantity),
        });
      },
    }),

    respondToTrade: tool({
      description: "Accept or reject the most recent pending trade offer you received.",
      parameters: z.object({
        accept: z.boolean().describe("true to accept, false to reject"),
      }),
      execute: async ({ accept }) => {
        return ctx.runMutation(internal.social.trading.respond, {
          responderId: agentId,
          accept,
        });
      },
    }),
  };
}

export const think = internalAction({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const context = await ctx.runQuery(
      internal.agents.queries.getThinkingContext,
      { agentId },
    );
    if (!context || !context.world) return;

    const {
      agent, world, memories, nearbyAgents, pendingConversations, nearbyResources,
      inventory, nearbyBuildings, relationships, myAlliances, myPendingProposals, pendingTrades,
    } = context;
    const tick = world.tick;

    const agentNames = new Map<string, string>();
    for (const r of relationships) {
      const target = await ctx.runQuery(internal.agents.queries.getById, { agentId: r.targetAgentId as typeof agentId });
      if (target) agentNames.set(r.targetAgentId, target.name);
    }

    const scored = scoreMemories(memories, tick);

    const systemPrompt = buildSystemPrompt({
      agent: { ...agent, _id: agentId as string },
      memories: scored.slice(0, 12),
      nearbyAgents: nearbyAgents.map((a) => ({
        name: a.name,
        position: a.position,
        status: a.status,
      })),
      nearbyResources,
      pendingConversations,
      inventory: inventory.map((i) => ({ itemType: i.itemType, quantity: i.quantity })),
      nearbyBuildings: nearbyBuildings.map((b) => ({ type: b.type, posX: b.posX, posY: b.posY })),
      relationships: relationships.map((r) => ({
        targetAgentId: agentNames.get(r.targetAgentId) ?? r.targetAgentId,
        trust: r.trust,
        affinity: r.affinity,
      })),
      myAlliances: myAlliances.map((a) => ({
        name: a.name,
        memberIds: a.memberIds.map(String),
        rules: a.rules,
      })),
      pendingProposals: myPendingProposals.map((p) => ({
        _id: p._id as string,
        content: p.content,
      })),
      pendingTrades: pendingTrades.map((t) => ({
        offer: t.offer,
        request: t.request,
      })),
      timeOfDay: world.timeOfDay,
      weather: world.weather,
      tick,
    });

    const tools = buildTools(ctx, agentId, tick);

    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt,
        prompt: "What do you want to do right now? Think briefly, then act.",
        tools,
        maxSteps: 3,
      });

      if (result.text) {
        await ctx.runMutation(internal.agents.memory.store, {
          agentId,
          type: "observation" as const,
          content: `I decided: ${result.text.slice(0, 300)}`,
          importance: 3,
          tick,
        });
      }

      await ctx.runMutation(internal.agents.actions.updateEmotion, {
        agentId,
        valence: agent.emotion.valence + (Math.random() - 0.5) * 0.1,
        arousal: agent.emotion.arousal + (Math.random() - 0.5) * 0.1,
      });
    } catch (error) {
      console.error(`Agent ${agent.name} thinking failed:`, error);
    }
  },
});

export const reflect = internalAction({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.runQuery(internal.agents.queries.getById, {
      agentId,
    });
    if (!agent) return;

    const world = await ctx.runQuery(internal.world.getState, {});
    const tick = world?.tick ?? 0;

    const lastReflectionTick = await ctx.runQuery(
      internal.agents.memory.getLastReflectionTick,
      { agentId },
    );

    const importance = await ctx.runQuery(
      internal.agents.memory.getUnreflectedImportance,
      { agentId, sinceTick: lastReflectionTick },
    );

    if (importance < 80) return;

    const memories = await ctx.runQuery(
      internal.agents.queries.getThinkingContext,
      { agentId },
    );
    if (!memories) return;

    const recentMemories = memories.memories
      .filter((m) => m.tick > lastReflectionTick && m.type !== "reflection")
      .slice(0, 15);

    if (recentMemories.length < 3) return;

    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: buildReflectionPrompt(agent.name, recentMemories),
        maxSteps: 1,
      });

      const reflections = result.text
        .split("\n")
        .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
        .filter((line) => line.length > 10);

      if (reflections.length > 0) {
        await ctx.runMutation(internal.agents.actions.storeReflections, {
          agentId,
          reflections: reflections.slice(0, 3),
          tick,
        });

        await ctx.runMutation(internal.agents.memory.store, {
          agentId,
          type: "observation" as const,
          content: `I spent time reflecting on my recent experiences.`,
          importance: 2,
          tick,
        });
      }
    } catch (error) {
      console.error(`Agent ${agent.name} reflection failed:`, error);
    }
  },
});
