import { mutation, query, internalQuery } from "./_generated/server";

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
