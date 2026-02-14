import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildSystemPrompt, buildReflectionPrompt, buildConversationPrompt } from "./prompts";
import { scoreMemories } from "./memory";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { MAP_REGIONS } from "../lib/constants";

// --- Tool Definitions ---

function buildTools(ctx: ActionCtx, agentId: Id<"agents">, tick: number) {
  return {
    goToResource: tool({
      description: "Travel to the nearest source of a resource type. The world will find the closest one for you.",
      inputSchema: z.object({
        resourceType: z.enum(["wood", "stone", "food", "metal", "herbs"]).describe("Type of resource to find"),
      }),
      execute: async ({ resourceType }) => {
        return ctx.runMutation(internal.agents.actions.goToNearestResource, {
          agentId,
          resourceType,
        });
      },
    }),

    goToPerson: tool({
      description: "Travel toward a specific person. Uses their current location if visible, or their last known location.",
      inputSchema: z.object({
        targetName: z.string().describe("Name of the person to find"),
      }),
      execute: async ({ targetName }) => {
        return ctx.runMutation(internal.agents.actions.seekAgentAction, {
          agentId,
          targetName,
        });
      },
    }),

    goToArea: tool({
      description: `Travel to a named region of the world. Regions: ${MAP_REGIONS.map((r) => r.name).join(", ")}.`,
      inputSchema: z.object({
        regionName: z.string().describe("Name of the region to travel to"),
      }),
      execute: async ({ regionName }) => {
        return ctx.runMutation(internal.agents.actions.goToRegion, {
          agentId,
          regionName,
        });
      },
    }),

    goToBuilding: tool({
      description: "Travel to the nearest building of a specific type (shelter, workshop, market, farm, storehouse, meetingHall).",
      inputSchema: z.object({
        buildingType: z.string().describe("Type of building to find"),
      }),
      execute: async ({ buildingType }) => {
        return ctx.runMutation(internal.agents.actions.goToNearestBuilding, {
          agentId,
          buildingType,
        });
      },
    }),

    explore: tool({
      description: "Wander in a direction to discover new resources, people, or places.",
      inputSchema: z.object({
        direction: z.enum(["north", "south", "east", "west"]).describe("Direction to explore"),
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
        const world = await ctx.runQuery(internal.world.getStateInternal, {});
        const maxX = (world?.mapWidth ?? 50) - 1;
        const maxY = (world?.mapHeight ?? 50) - 1;
        return ctx.runMutation(internal.agents.actions.moveAgent, {
          agentId,
          targetX: Math.max(0, Math.min(maxX, agent.position.x + offset.dx)),
          targetY: Math.max(0, Math.min(maxY, agent.position.y + offset.dy)),
        });
      },
    }),

    speak: tool({
      description: "Say something to a nearby person. They will hear you and may respond. Have real conversations — share thoughts, make plans, ask questions.",
      inputSchema: z.object({
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

    gatherResource: tool({
      description: "Gather a resource from nearby tiles. You must be close to a resource to gather it.",
      inputSchema: z.object({
        resourceType: z.enum(["wood", "stone", "food", "metal", "herbs"]).describe("Type of resource"),
      }),
      execute: async ({ resourceType }) => {
        return ctx.runMutation(internal.agents.actions.gatherResource, {
          agentId,
          resourceType,
        });
      },
    }),

    craft: tool({
      description: "Craft an item. Recipes: wooden_plank (3 wood), stone_tools (2 stone + 1 wood), meal (2 food), medicine (3 herbs), metal_tools (2 metal + 1 wood), rope (2 herbs + 1 wood).",
      inputSchema: z.object({
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
      description: "Build a structure at your current location. Types: shelter (5w+3s), workshop (8w+5s+2m), market (10w+8s), farm (4w+2s), storehouse (6w+4s), meetingHall (12w+10s+3m).",
      inputSchema: z.object({
        buildingType: z.string().describe("Type of building to construct"),
      }),
      execute: async ({ buildingType }) => {
        return ctx.runMutation(internal.agents.actions.buildStructure, {
          agentId,
          buildingType: buildingType as "shelter" | "workshop" | "market" | "meetingHall" | "farm" | "storehouse",
        });
      },
    }),

    rest: tool({
      description: "Rest and recover energy. Use when your energy is low.",
      inputSchema: z.object({}),
      execute: async () => {
        return ctx.runMutation(internal.agents.actions.restAgent, { agentId });
      },
    }),

    eat: tool({
      description: "Eat food from your inventory. Meals give 25 energy, raw food gives 10.",
      inputSchema: z.object({}),
      execute: async () => {
        return ctx.runMutation(internal.agents.actions.eatFood, { agentId });
      },
    }),

    think: tool({
      description: "Record a private thought about your situation, feelings, or plans.",
      inputSchema: z.object({
        thought: z.string().describe("Your thought"),
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
      description: "Set a goal or intention for the near future.",
      inputSchema: z.object({
        plan: z.string().describe("Your plan or goal"),
      }),
      execute: async ({ plan }) => {
        return ctx.runMutation(internal.agents.actions.updatePlan, {
          agentId,
          plan,
          tick,
        });
      },
    }),

    commitToPlan: tool({
      description: "Commit to a multi-step plan. Each step executes in order across multiple think cycles.",
      inputSchema: z.object({
        plan: z.string().describe("Brief overall goal"),
        steps: z.array(z.string()).describe("Ordered list of concrete steps"),
      }),
      execute: async ({ plan, steps }) => {
        return ctx.runMutation(internal.agents.actions.commitToPlan, {
          agentId,
          plan,
          steps,
          tick,
        });
      },
    }),

    advancePlanStep: tool({
      description: "Mark the current plan step as complete and move to the next.",
      inputSchema: z.object({}),
      execute: async () => {
        return ctx.runMutation(internal.agents.actions.advancePlanStep, { agentId });
      },
    }),

    abandonPlan: tool({
      description: "Abandon your current plan when it's no longer possible or relevant.",
      inputSchema: z.object({
        reason: z.string().describe("Why you are abandoning the plan"),
      }),
      execute: async ({ reason }) => {
        return ctx.runMutation(internal.agents.actions.abandonPlan, {
          agentId,
          reason,
          tick,
        });
      },
    }),

    giveItem: tool({
      description: "Give an item from your inventory to a nearby person.",
      inputSchema: z.object({
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

    proposeTrade: tool({
      description: "Propose a trade to a nearby person.",
      inputSchema: z.object({
        targetName: z.string().describe("Person to trade with"),
        offerType: z.string().describe("Item you are offering"),
        offerQuantity: z.number().describe("How many you offer"),
        requestType: z.string().describe("Item you want"),
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
      description: "Accept or reject a pending trade offer.",
      inputSchema: z.object({
        accept: z.boolean().describe("true to accept, false to reject"),
      }),
      execute: async ({ accept }) => {
        return ctx.runMutation(internal.social.trading.respond, {
          responderId: agentId,
          accept,
        });
      },
    }),

    formAlliance: tool({
      description: "Found a new alliance or group.",
      inputSchema: z.object({
        name: z.string().describe("Name for the alliance"),
      }),
      execute: async ({ name }) => {
        return ctx.runMutation(internal.social.alliances.create, { founderId: agentId, name });
      },
    }),

    inviteToAlliance: tool({
      description: "Invite a nearby person to join your alliance.",
      inputSchema: z.object({
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
      description: "Propose a rule for your alliance. Members will vote on it.",
      inputSchema: z.object({
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

    voteOnProposal: tool({
      description: "Vote on a pending governance proposal.",
      inputSchema: z.object({
        proposalId: z.string().describe("ID of the proposal"),
        vote: z.boolean().describe("true for yes, false for no"),
      }),
      execute: async ({ proposalId, vote }) => {
        return ctx.runMutation(internal.social.alliances.vote, {
          voterId: agentId,
          proposalId: proposalId as Id<"proposals">,
          voteValue: vote,
        });
      },
    }),

    confront: tool({
      description: "Confront a nearby person about a grievance. This damages your relationship.",
      inputSchema: z.object({
        targetName: z.string().describe("Person to confront"),
        grievance: z.string().describe("What you are confronting them about"),
      }),
      execute: async ({ targetName, grievance }) => {
        return ctx.runMutation(internal.agents.actions.confrontAgent, {
          agentId,
          targetName,
          grievance,
        });
      },
    }),

    depositToStorehouse: tool({
      description: "Deposit items into a nearby alliance storehouse.",
      inputSchema: z.object({
        itemType: z.string().describe("Type of item to deposit"),
        quantity: z.number().describe("How many to deposit"),
      }),
      execute: async ({ itemType, quantity }) => {
        return ctx.runMutation(internal.agents.actions.depositToStorehouse, {
          agentId,
          itemType,
          quantity: Math.round(quantity),
        });
      },
    }),

    withdrawFromStorehouse: tool({
      description: "Withdraw items from a nearby alliance storehouse.",
      inputSchema: z.object({
        itemType: z.string().describe("Type of item to withdraw"),
        quantity: z.number().describe("How many to withdraw"),
      }),
      execute: async ({ itemType, quantity }) => {
        return ctx.runMutation(internal.agents.actions.withdrawFromStorehouse, {
          agentId,
          itemType,
          quantity: Math.round(quantity),
        });
      },
    }),

    repairBuilding: tool({
      description: "Repair the building at your location. Costs 2 wood + 1 stone.",
      inputSchema: z.object({}),
      execute: async () => {
        return ctx.runMutation(internal.agents.actions.repairBuilding, { agentId });
      },
    }),

    checkInventory: tool({
      description: "Check what items you are carrying.",
      inputSchema: z.object({}),
      execute: async () => {
        return ctx.runMutation(internal.agents.actions.checkInventory, { agentId });
      },
    }),
  };
}

// --- Think ---

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
      storehouseInventory, reputations, daySummaries, beliefs, settlements,
    } = context;
    const tick = world.tick;

    if (nearbyAgents.length > 0) {
      await ctx.runMutation(internal.agents.actions.updateSightings, {
        agentId,
        sightings: nearbyAgents.map((a) => ({
          targetId: a._id as typeof agentId,
          position: a.position,
        })),
        tick,
      });
    }

    const agentNames = new Map<string, string>();
    for (const a of nearbyAgents) {
      agentNames.set(String(a._id), a.name);
    }
    for (const r of relationships) {
      if (!agentNames.has(r.targetAgentId)) {
        const target = await ctx.runQuery(internal.agents.queries.getById, { agentId: r.targetAgentId as typeof agentId });
        if (target) agentNames.set(r.targetAgentId, target.name);
      }
    }
    for (const rep of (reputations ?? [])) {
      if (!agentNames.has(rep.agentId as string)) {
        const a = await ctx.runQuery(internal.agents.queries.getById, { agentId: rep.agentId as typeof agentId });
        if (a) agentNames.set(rep.agentId as string, a.name);
      }
    }

    const scored = scoreMemories(memories, tick);

    const nearbyIds = new Set(nearbyAgents.map((a) => String(a._id)));
    const lastSightings = relationships
      .filter((r) => r.lastSeenPosition && r.lastSeenTick && !nearbyIds.has(r.targetAgentId))
      .map((r) => ({
        name: agentNames.get(r.targetAgentId) ?? r.targetAgentId,
        position: r.lastSeenPosition!,
        ticksAgo: tick - (r.lastSeenTick ?? 0),
      }))
      .filter((s) => s.ticksAgo < 200);

    const reputationEntries = (reputations ?? []).map((r) => ({
      name: agentNames.get(r.agentId as string) ?? r.agentId,
      score: r.score,
    }));

    const TICKS_PER_DAY = 192;
    const day = Math.floor(tick / TICKS_PER_DAY) + 1;

    const systemPrompt = buildSystemPrompt({
      agent: { ...agent, _id: String(agentId), planSteps: agent.planSteps ?? undefined, planStep: agent.planStep ?? undefined },
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
        sharedExperiences: r.sharedExperiences,
        lastTopics: r.lastTopics,
        opinion: r.opinion,
        role: r.role,
      })),
      myAlliances: myAlliances.map((a) => ({
        name: a.name,
        memberIds: a.memberIds.map(String),
        rules: a.rules,
      })),
      pendingProposals: myPendingProposals.map((p) => ({
        _id: p._id as string,
        content: p.content,
        allianceName: myAlliances.find((a) => a._id === p.allianceId)?.name,
      })),
      pendingTrades: pendingTrades.map((t) => ({
        offer: t.offer,
        request: t.request,
      })),
      lastSightings,
      storehouseInventory: storehouseInventory ?? [],
      reputations: reputationEntries,
      daySummaries: (daySummaries ?? []).map((s) => ({ content: s.content, day: s.day ?? undefined })),
      beliefs: (beliefs ?? []).map((b) => ({
        category: b.category,
        content: b.content,
        confidence: b.confidence,
      })),
      settlements: (settlements ?? []).map((s) => ({
        name: s.name,
        region: s.region,
        buildings: s.buildings.map((b) => ({ type: b.type })),
      })),
      timeOfDay: world.timeOfDay,
      weather: world.weather,
      season: world.season,
      day,
      tick,
    });

    const tools = buildTools(ctx, agentId, tick);

    const hasPlan = agent.planSteps && agent.planStep !== undefined && agent.planStep < (agent.planSteps?.length ?? 0);
    const userPrompt = hasPlan
      ? `You are on step ${(agent.planStep ?? 0) + 1}/${agent.planSteps!.length} of your plan: "${agent.planSteps![agent.planStep ?? 0]}". Execute this step now. If completed, call advancePlanStep. If impossible, call abandonPlan.`
      : "What do you want to do right now? Consider your feelings, relationships, goals, and surroundings. Think briefly, then act.";

    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt,
        prompt: userPrompt,
        tools,
        stopWhen: stepCountIs(3),
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
        valence: Math.round((agent.emotion.valence + (Math.random() - 0.5) * 0.1) * 100) / 100,
        arousal: Math.round((agent.emotion.arousal + (Math.random() - 0.5) * 0.1) * 100) / 100,
      });
    } catch (error) {
      console.error(`Agent ${agent.name} thinking failed:`, error);
    }
  },
});

// --- Reflect ---

export const reflect = internalAction({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.runQuery(internal.agents.queries.getById, { agentId });
    if (!agent) return;

    const world = await ctx.runQuery(internal.world.getStateInternal, {});
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

    const context = await ctx.runQuery(
      internal.agents.queries.getThinkingContext,
      { agentId },
    );
    if (!context) return;

    const recentMemories = context.memories
      .filter((m) => m.tick > lastReflectionTick && m.type !== "reflection")
      .slice(0, 15);

    if (recentMemories.length < 3) return;

    const existingBeliefs = (context.beliefs ?? []).map((b) => ({
      category: b.category,
      content: b.content,
      confidence: b.confidence,
    }));

    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: buildReflectionPrompt(agent.name, recentMemories, existingBeliefs),
        stopWhen: stepCountIs(1),
      });

      const text = result.text;

      // Parse reflections (lines between REFLECTIONS: and BELIEFS:)
      const reflectionMatch = text.match(/REFLECTIONS?:\s*\n([\s\S]*?)(?=BELIEFS?:|$)/i);
      const reflectionLines = reflectionMatch
        ? reflectionMatch[1].split("\n").map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim()).filter((l) => l.length > 10)
        : text.split("\n").map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim()).filter((l) => l.length > 10);

      if (reflectionLines.length > 0) {
        await ctx.runMutation(internal.agents.actions.storeReflections, {
          agentId,
          reflections: reflectionLines.slice(0, 3),
          tick,
        });
      }

      // Parse beliefs (lines after BELIEFS:)
      const beliefMatch = text.match(/BELIEFS?:\s*\n([\s\S]*?)$/i);
      if (beliefMatch && !beliefMatch[1].trim().toLowerCase().startsWith("none")) {
        const beliefLines = beliefMatch[1].split("\n").filter((l) => l.trim().length > 5);
        for (const line of beliefLines.slice(0, 2)) {
          const catMatch = line.match(/\[(value|opinion|philosophy|goal)\]\s*(.+)/i);
          if (catMatch) {
            const category = catMatch[1].toLowerCase() as "value" | "opinion" | "philosophy" | "goal";
            const content = catMatch[2].replace(/^[-*•\s]+/, "").trim();
            if (content.length > 5) {
              await ctx.runMutation(internal.agents.actions.storeBelief, {
                agentId,
                category,
                content,
                confidence: 0.5,
                tick,
                formedFrom: "reflection",
              });
            }
          }
        }
      }

      await ctx.runMutation(internal.agents.memory.store, {
        agentId,
        type: "observation" as const,
        content: "I spent time reflecting on my recent experiences.",
        importance: 2,
        tick,
      });
    } catch (error) {
      console.error(`Agent ${agent.name} reflection failed:`, error);
    }
  },
});

// --- Conversation Response ---

const MAX_CONVERSATION_EXCHANGES = 8;

export const respondToConversation = internalAction({
  args: {
    agentId: v.id("agents"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { agentId, conversationId }) => {
    const agent = await ctx.runQuery(internal.agents.queries.getById, { agentId });
    if (!agent) return;

    if (agent.status === "sleeping") return;

    const world = await ctx.runQuery(internal.world.getStateInternal, {});
    const tick = world?.tick ?? 0;

    const context = await ctx.runQuery(internal.agents.queries.getThinkingContext, { agentId });
    if (!context) return;

    let conv = context.pendingConversations.find((c) =>
      String((c as Record<string, unknown>)._id) === String(conversationId),
    );
    if (!conv) {
      conv = context.pendingConversations.find((c) =>
        c.participantIds.some((id) => String(id) === String(agentId)),
      );
    }
    if (!conv || conv.messages.length === 0) return;

    const myMessages = conv.messages.filter((m) => m.speakerId === String(agentId));
    if (myMessages.length >= MAX_CONVERSATION_EXCHANGES) return;

    const speakerNames = new Map<string, string>();
    speakerNames.set(String(agentId), agent.name);

    const partnerId = conv.participantIds.find((id) => id !== String(agentId));
    if (partnerId) {
      const partner = await ctx.runQuery(internal.agents.queries.getById, {
        agentId: partnerId as typeof agentId,
      });
      if (partner) speakerNames.set(partnerId, partner.name);
    }

    const partnerName = partnerId ? (speakerNames.get(partnerId) ?? "Someone") : "Someone";

    const messages = conv.messages.map((m) => ({
      speakerName: speakerNames.get(m.speakerId) ?? "Unknown",
      content: m.content,
    }));

    let previousConversationSummary: string | undefined;
    if (partnerId) {
      const prevConvs = await ctx.runQuery(
        internal.agents.queries.getPreviousConversations,
        { agentId, partnerId: partnerId as typeof agentId, limit: 2 },
      );
      if (prevConvs.length > 0) {
        const summaryLines = prevConvs.map((c) => {
          const lastMessages = c.messages.slice(-3).map((m) => {
            const name = speakerNames.get(String(m.speakerId)) ?? "Someone";
            return `${name}: "${m.content}"`;
          });
          return lastMessages.join("\n");
        });
        previousConversationSummary = summaryLines.join("\n---\n");
      }
    }

    const prompt = buildConversationPrompt(agent, partnerName, messages, previousConversationSummary);

    const tools = {
      speak: tool({
        description: `Reply to ${partnerName}.`,
        inputSchema: z.object({
          targetName: z.string().describe("Name of the person to reply to"),
          message: z.string().describe("Your reply"),
        }),
        execute: async ({ targetName, message }: { targetName: string; message: string }) => {
          return ctx.runMutation(internal.agents.actions.speakTo, {
            speakerId: agentId,
            targetName,
            message,
          });
        },
      }),
      think: tool({
        description: "Record a private thought about the conversation.",
        inputSchema: z.object({
          thought: z.string().describe("Your thought"),
        }),
        execute: async ({ thought }: { thought: string }) => {
          return ctx.runMutation(internal.agents.actions.recordThought, {
            agentId,
            thought,
            tick,
          });
        },
      }),
      setPlan: tool({
        description: "Set a new goal inspired by this conversation.",
        inputSchema: z.object({
          plan: z.string().describe("Your new goal"),
        }),
        execute: async ({ plan }: { plan: string }) => {
          return ctx.runMutation(internal.agents.actions.updatePlan, {
            agentId,
            plan,
            tick,
          });
        },
      }),
      proposeTrade: tool({
        description: "Propose a trade deal during conversation.",
        inputSchema: z.object({
          targetName: z.string().describe("Person to trade with"),
          offerType: z.string().describe("Item you offer"),
          offerQuantity: z.number().describe("How many you offer"),
          requestType: z.string().describe("Item you want"),
          requestQuantity: z.number().describe("How many you want"),
        }),
        execute: async ({ targetName, offerType, offerQuantity, requestType, requestQuantity }: {
          targetName: string; offerType: string; offerQuantity: number;
          requestType: string; requestQuantity: number;
        }) => {
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
    };

    try {
      await generateText({
        model: openai("gpt-4o-mini"),
        system: prompt,
        prompt: `${partnerName} just spoke to you. Respond naturally — be engaging, share your thoughts, ask questions.`,
        tools,
        stopWhen: stepCountIs(1),
      });
    } catch (error) {
      console.error(`Agent ${agent.name} conversation response failed:`, error);
    }
  },
});

// --- Day Summary ---

export const generateDaySummary = internalAction({
  args: { agentId: v.id("agents"), day: v.number(), tick: v.number() },
  handler: async (ctx, { agentId, day, tick }) => {
    const agent = await ctx.runQuery(internal.agents.queries.getById, { agentId });
    if (!agent) return;

    const context = await ctx.runQuery(internal.agents.queries.getThinkingContext, { agentId });
    if (!context) return;

    const TICKS_PER_DAY = 192;
    const dayStart = (day - 1) * TICKS_PER_DAY;
    const todayMemories = context.memories
      .filter((m) => m.tick >= dayStart && m.type !== "day_summary")
      .slice(0, 20);

    if (todayMemories.length < 3) return;

    const memoryLines = todayMemories
      .map((m) => `- [${m.type}] ${m.content}`)
      .join("\n");

    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `You are ${agent.name}. It is the end of Day ${day}. Write a brief 2-3 sentence summary of your day. Focus on people you met, conversations you had, things you built or accomplished, and how you feel. Don't mention coordinates or tile numbers.

YOUR DAY'S EXPERIENCES:
${memoryLines}

Write in first person as ${agent.name}. Be specific about events, people, and feelings.`,
        stopWhen: stepCountIs(1),
      });

      if (result.text) {
        await ctx.runMutation(internal.agents.memory.store, {
          agentId,
          type: "day_summary" as const,
          content: `[Day ${day} Summary] ${result.text.slice(0, 500)}`,
          importance: 9,
          tick,
          day,
        });
      }
    } catch (error) {
      console.error(`Agent ${agent.name} day summary failed:`, error);
    }
  },
});
