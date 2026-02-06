import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildSystemPrompt } from "./agents/prompts";
import { scoreMemories } from "./agents/memory";

interface ThinkingAgent {
  name: string;
  backstory: string;
  personality: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  position: { x: number; y: number };
  energy: number;
  emotion: { valence: number; arousal: number };
  status: string;
  currentPlan?: string;
}

interface NearbyAgent {
  name: string;
  position: { x: number; y: number };
  status: string;
}

interface NearbyBuilding {
  type: string;
  posX: number;
  posY: number;
}

interface InventoryItem {
  itemType: string;
  quantity: number;
}

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
    const typedAgent = agent as ThinkingAgent;
    const tick = world.tick;
    const scored = scoreMemories(memories, tick);

    const systemPrompt = `${buildSystemPrompt({
      agent: { ...typedAgent, _id: String(agentId) },
      memories: scored.slice(0, 10),
      nearbyAgents: nearbyAgents.map((a: NearbyAgent) => ({ name: a.name, position: a.position, status: a.status })),
      nearbyResources,
      pendingConversations,
      inventory: inventory.map((i: InventoryItem) => ({ itemType: i.itemType, quantity: i.quantity })),
      nearbyBuildings: nearbyBuildings.map((b: NearbyBuilding) => ({ type: b.type, posX: b.posX, posY: b.posY })),
      relationships: [],
      myAlliances: [],
      pendingProposals: [],
      pendingTrades: [],
      timeOfDay: world.timeOfDay,
      weather: world.weather,
      tick,
    })}

A human observer is interviewing you. Respond in character as ${typedAgent.name}. Be genuine, thoughtful, and reflect your personality. Keep responses concise (2-4 sentences).`;

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
