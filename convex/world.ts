import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getState = query({
  handler: async (ctx) => {
    return ctx.db.query("worldState").first();
  },
});

export const getStateInternal = internalQuery({
  handler: async (ctx) => {
    return ctx.db.query("worldState").first();
  },
});

export const togglePause = mutation({
  handler: async (ctx) => {
    const state = await ctx.db.query("worldState").first();
    if (!state) return;
    await ctx.db.patch(state._id, { paused: !state.paused });
  },
});

export const getResources = query({
  handler: async (ctx) => {
    return ctx.db.query("resources").collect();
  },
});

export const getBuildings = query({
  handler: async (ctx) => {
    return ctx.db.query("buildings").collect();
  },
});

export const getInventory = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    return ctx.db
      .query("inventory")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .collect();
  },
});

export const getAlliances = query({
  handler: async (ctx) => {
    return ctx.db.query("alliances").collect();
  },
});

export const getRelationships = query({
  handler: async (ctx) => {
    return ctx.db.query("relationships").collect();
  },
});

export const getReputations = query({
  handler: async (ctx) => {
    return ctx.db.query("reputation").collect();
  },
});
