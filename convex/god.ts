import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const changeWeather = mutation({
  args: {
    weather: v.union(
      v.literal("clear"),
      v.literal("rain"),
      v.literal("storm"),
      v.literal("fog"),
    ),
  },
  handler: async (ctx, { weather }) => {
    const state = await ctx.db.query("worldState").first();
    if (!state) return;
    await ctx.db.patch(state._id, { weather });
    await ctx.db.insert("worldEvents", {
      type: "god_action",
      description: `Weather changed to ${weather} by divine intervention.`,
      involvedAgentIds: [],
      tick: state.tick,
    });
  },
});

export const spawnResource = mutation({
  args: {
    tileX: v.number(),
    tileY: v.number(),
    type: v.union(
      v.literal("wood"),
      v.literal("stone"),
      v.literal("food"),
      v.literal("metal"),
      v.literal("herbs"),
    ),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("resources", {
      tileX: args.tileX,
      tileY: args.tileY,
      type: args.type,
      quantity: args.quantity,
      maxQuantity: args.quantity * 2,
      regenRate: 0.2,
    });
  },
});

export const setSpeed = mutation({
  args: { paused: v.boolean() },
  handler: async (ctx, { paused }) => {
    const state = await ctx.db.query("worldState").first();
    if (!state) return;
    await ctx.db.patch(state._id, { paused });
  },
});

export const resetWorld = mutation({
  handler: async (ctx) => {
    const tables = ["agents", "memories", "relationships", "resources", "inventory",
      "buildings", "alliances", "proposals", "trades", "conversations", "worldEvents", "worldState"] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
  },
});
