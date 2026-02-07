import { query } from "../_generated/server";

export const getEconomyStats = query({
  handler: async (ctx) => {
    const resources = await ctx.db.query("resources").collect();
    const inventory = await ctx.db.query("inventory").collect();
    const trades = await ctx.db.query("trades").collect();
    const agents = await ctx.db.query("agents").collect();

    const resourceTotals: Record<string, number> = {};
    for (const r of resources) {
      resourceTotals[r.type] = Math.round((resourceTotals[r.type] ?? 0) + r.quantity);
    }

    const agentWealth: Array<{ name: string; total: number }> = [];
    for (const agent of agents) {
      const items = inventory.filter((i) => i.agentId === agent._id);
      const total = Math.round(items.reduce((sum, i) => sum + i.quantity, 0));
      agentWealth.push({ name: agent.name, total });
    }
    agentWealth.sort((a, b) => b.total - a.total);

    const completedTrades = trades.filter((t) => t.status === "accepted").length;
    const pendingTrades = trades.filter((t) => t.status === "pending").length;

    return {
      resourceTotals,
      agentWealth,
      completedTrades,
      pendingTrades,
      totalTrades: trades.length,
    };
  },
});

export const getSocialStats = query({
  handler: async (ctx) => {
    const relationships = await ctx.db.query("relationships").collect();
    const alliances = await ctx.db.query("alliances").collect();
    const conversations = await ctx.db.query("conversations").collect();

    const avgTrust =
      relationships.length > 0
        ? relationships.reduce((s, r) => s + r.trust, 0) / relationships.length
        : 0;

    return {
      relationshipCount: relationships.length,
      avgTrust,
      allianceCount: alliances.length,
      conversationCount: conversations.length,
    };
  },
});
