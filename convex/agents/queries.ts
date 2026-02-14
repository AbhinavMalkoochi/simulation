import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { detectSettlements } from "../world/systems";

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

    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .collect();

    const buildings = await ctx.db.query("buildings").collect();
    const nearbyBuildings = buildings.filter(
      (b) =>
        Math.abs(b.posX - agent.position.x) <= 5 &&
        Math.abs(b.posY - agent.position.y) <= 5,
    );

    const relationships = await ctx.db
      .query("relationships")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .collect();

    const alliances = await ctx.db.query("alliances").collect();
    const myAlliances = alliances.filter((a) => a.memberIds.includes(agentId));

    const pendingProposals = await ctx.db
      .query("proposals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const myPendingProposals = pendingProposals.filter((p) =>
      myAlliances.some((a) => a._id === p.allianceId) &&
      !p.votes.find((v) => v.agentId === agentId),
    );

    const allTrades = await ctx.db
      .query("trades")
      .withIndex("by_responder", (q) => q.eq("responderId", agentId))
      .collect();
    const pendingTrades = allTrades.filter((t) => t.status === "pending");

    // Fetch community reputations
    const reputations = await ctx.db.query("reputation").collect();

    // Check for storehouse inventory if near an alliance storehouse
    let storehouseInventory: Array<{ itemType: string; quantity: number }> = [];
    if (myAlliances.length > 0) {
      const allianceIds = new Set(myAlliances.map((a) => a._id));
      const nearbyStorehouse = nearbyBuildings.find(
        (b) => b.type === "storehouse" && b.condition > 0 && b.allianceId && allianceIds.has(b.allianceId),
      );
      if (nearbyStorehouse) {
        const items = await ctx.db
          .query("buildingInventory")
          .withIndex("by_building", (q) => q.eq("buildingId", nearbyStorehouse._id))
          .collect();
        storehouseInventory = items.map((i) => ({ itemType: i.itemType, quantity: i.quantity }));
      }
    }

    const daySummaries = await ctx.db
      .query("memories")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", agentId).eq("type", "day_summary"),
      )
      .order("desc")
      .take(3);

    const settlements = await detectSettlements(ctx);

    return {
      agent, world, memories, nearbyAgents, pendingConversations, nearbyResources,
      inventory, nearbyBuildings, relationships, myAlliances, myPendingProposals, pendingTrades,
      storehouseInventory,
      reputations,
      daySummaries,
      settlements,
    };
  },
});

export const getById = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    return ctx.db.get(agentId);
  },
});

/** Get the last N closed conversations between two specific agents */
export const getPreviousConversations = internalQuery({
  args: {
    agentId: v.id("agents"),
    partnerId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, partnerId, limit }) => {
    const conversations = await ctx.db
      .query("conversations")
      .order("desc")
      .take(50);

    return conversations
      .filter(
        (c) =>
          c.endTick !== undefined &&
          c.participantIds.includes(agentId) &&
          c.participantIds.includes(partnerId),
      )
      .slice(0, limit ?? 2);
  },
});
