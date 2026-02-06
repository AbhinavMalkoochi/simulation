import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const store = internalMutation({
  args: {
    agentId: v.id("agents"),
    type: v.union(
      v.literal("observation"),
      v.literal("reflection"),
      v.literal("plan"),
      v.literal("conversation"),
    ),
    content: v.string(),
    importance: v.number(),
    tick: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("memories", args);
  },
});

export const getUnreflectedImportance = internalQuery({
  args: {
    agentId: v.id("agents"),
    sinceTick: v.number(),
  },
  handler: async (ctx, { agentId, sinceTick }) => {
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(100);

    return memories
      .filter((m) => m.tick > sinceTick && m.type !== "reflection")
      .reduce((sum, m) => sum + m.importance, 0);
  },
});

export const getLastReflectionTick = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const reflection = await ctx.db
      .query("memories")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", agentId).eq("type", "reflection"),
      )
      .order("desc")
      .first();
    return reflection?.tick ?? 0;
  },
});

export function scoreMemories(
  memories: Array<{ content: string; importance: number; tick: number; type: string }>,
  currentTick: number,
): Array<{ content: string; importance: number; tick: number; type: string; score: number }> {
  return memories
    .map((m) => {
      const age = currentTick - m.tick;
      const recency = Math.exp(-age / 50);
      const importanceNorm = m.importance / 10;
      const typeBonus = m.type === "reflection" ? 0.15 : 0;
      return { ...m, score: recency * 0.35 + importanceNorm * 0.5 + typeBonus };
    })
    .sort((a, b) => b.score - a.score);
}
