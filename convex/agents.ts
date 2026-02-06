import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return ctx.db.query("agents").collect();
  },
});

export const getById = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    return ctx.db.get(agentId);
  },
});

export const getConversations = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const all = await ctx.db.query("conversations").order("desc").take(20);
    return all.filter((c) => c.participantIds.includes(agentId));
  },
});

export const getMemories = query({
  args: { agentId: v.id("agents"), limit: v.optional(v.number()) },
  handler: async (ctx, { agentId, limit }) => {
    return ctx.db
      .query("memories")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(limit ?? 20);
  },
});
