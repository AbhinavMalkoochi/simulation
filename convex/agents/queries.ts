import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const getThinkingContext = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return null;

    const world = await ctx.db.query("worldState").first();

    const allAgents = await ctx.db.query("agents").collect();
    const nearbyAgents = allAgents.filter((a) => {
      if (a._id === agentId) return false;
      return (
        Math.abs(a.position.x - agent.position.x) <= 6 &&
        Math.abs(a.position.y - agent.position.y) <= 6
      );
    });

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(30);

    const conversations = await ctx.db
      .query("conversations")
      .order("desc")
      .take(20);
    const pendingConversations = conversations.filter(
      (c) => c.participantIds.includes(agentId) && !c.endTick,
    );

    const resources = await ctx.db
      .query("resources")
      .collect();
    const nearbyResources = resources.filter(
      (r) =>
        Math.abs(r.tileX - agent.position.x) <= 4 &&
        Math.abs(r.tileY - agent.position.y) <= 4 &&
        r.quantity > 0,
    );

    return { agent, world, memories, nearbyAgents, pendingConversations, nearbyResources };
  },
});

export const getById = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    return ctx.db.get(agentId);
  },
});
