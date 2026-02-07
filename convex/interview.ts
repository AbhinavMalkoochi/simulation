import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
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

    const { agent, world, memories, nearbyAgents, nearbyResources, pendingConversations, inventory, nearbyBuildings } = context;
    const tick = world.tick;
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
      timeOfDay: world.timeOfDay,
      weather: world.weather,
      tick,
    })}

A human observer is interviewing you. Respond in character as ${agent.name}. Be genuine, thoughtful, and reflect your personality. Keep responses concise (2-4 sentences).`;

    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
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
