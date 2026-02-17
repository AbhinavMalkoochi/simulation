import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateText, stepCountIs } from "ai";
import { xai } from "@ai-sdk/xai";
import { buildSystemPrompt } from "./agents/prompts";
import { scoreMemories } from "./agents/memory";

export const ask = action({
  args: {
    agentId: v.id("agents"),
    question: v.string(),
  },
  handler: async (ctx, { agentId, question }): Promise<string> => {
    const context = await ctx.runQuery(
      internal.agents.queries.getThinkingContext,
      { agentId },
    );
    if (!context || !context.world) return "Agent not found.";

    const { agent, world, memories, nearbyAgents, nearbyResources, pendingConversations, inventory, nearbyBuildings, daySummaries, settlements, beliefs } = context;
    const tick = world.tick;
    const TICKS_PER_DAY = 192;
    const day = Math.floor(tick / TICKS_PER_DAY) + 1;
    const scored = scoreMemories(memories, tick);

    const systemPrompt = `${buildSystemPrompt({
      agent: { ...agent, _id: String(agentId) },
      memories: scored.slice(0, 10),
      nearbyAgents: nearbyAgents.map((a) => ({ name: a.name, position: a.position, status: a.status })),
      nearbyResources,
      pendingConversations,
      inventory: inventory.map((i) => ({ itemType: i.itemType, quantity: i.quantity })),
      nearbyBuildings: nearbyBuildings.map((b) => ({ type: b.type, posX: b.posX, posY: b.posY })),
      relationships: [],
      myAlliances: [],
      pendingProposals: [],
      pendingTrades: [],
      lastSightings: [],
      storehouseInventory: [],
      reputations: [],
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
    })}

A human observer is interviewing you. Respond in character as ${agent.name}. Be genuine, thoughtful, and reflect your personality. Keep responses concise (2-4 sentences).`;

    try {
      const result = await generateText({
        model: xai("grok-3-mini"),
        system: systemPrompt,
        prompt: question,
        stopWhen: stepCountIs(1),
      });
      return result.text;
    } catch {
      return "...I'm not sure what to say right now.";
    }
  },
});
