import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { tool } from "ai";
import { z } from "zod";
import { buildSystemPrompt, buildReflectionPrompt } from "./prompts";
import { scoreMemories } from "./memory";
import type { Id, Doc } from "../_generated/dataModel";
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

    const { agent, world, memories, nearbyAgents, pendingConversations, nearbyResources } = context;
    const tick = world.tick;

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
      timeOfDay: world.timeOfDay,
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
