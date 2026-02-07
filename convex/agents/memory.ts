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
      v.literal("day_summary"),
    ),
    content: v.string(),
    importance: v.number(),
    tick: v.number(),
    day: v.optional(v.number()),
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

export const getRecentDaySummaries = internalQuery({
  args: { agentId: v.id("agents"), limit: v.optional(v.number()) },
  handler: async (ctx, { agentId, limit }) => {
    const summaries = await ctx.db
      .query("memories")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", agentId).eq("type", "day_summary"),
      )
      .order("desc")
      .take(limit ?? 3);
    return summaries;
  },
});

export function scoreMemories(
  memories: Array<{ content: string; importance: number; tick: number; type: string }>,
  currentTick: number,
): Array<{ content: string; importance: number; tick: number; type: string; score: number }> {
  return memories
    .map((m) => {
      const age = currentTick - m.tick;
      // Reflections and day summaries decay much slower (3x longer half-life)
      const isLongTerm = m.type === "reflection" || m.type === "day_summary";
      const decayConstant = isLongTerm ? 150 : 50;
      const recency = Math.exp(-age / decayConstant);
      const importanceNorm = m.importance / 10;
      // Bonus for synthesized/high-level memories
      const typeBonus = m.type === "day_summary" ? 0.2 : m.type === "reflection" ? 0.15 : 0;
      // Landmark memories (importance >= 8) get a floor score to prevent total decay
      const landmarkFloor = m.importance >= 8 ? 0.25 : 0;
      const rawScore = recency * 0.3 + importanceNorm * 0.5 + typeBonus;
      return { ...m, score: Math.max(rawScore, landmarkFloor) };
    })
    .sort((a, b) => b.score - a.score);
}
