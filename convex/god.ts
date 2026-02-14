import { mutation } from "./_generated/server";
import { v } from "convex/values";

function checkAdmin(secret: string): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return true; // If no secret configured, allow all (dev mode)
  return secret === expected;
}

export const changeWeather = mutation({
  args: {
    weather: v.union(
      v.literal("clear"),
      v.literal("rain"),
      v.literal("storm"),
      v.literal("fog"),
    ),
    adminSecret: v.optional(v.string()),
  },
  handler: async (ctx, { weather, adminSecret }) => {
    if (!checkAdmin(adminSecret ?? "")) return;
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
    adminSecret: v.optional(v.string()),
  },
  handler: async (ctx, { tileX, tileY, type, quantity, adminSecret }) => {
    if (!checkAdmin(adminSecret ?? "")) return;
    await ctx.db.insert("resources", {
      tileX,
      tileY,
      type,
      quantity,
      maxQuantity: quantity * 2,
      regenRate: 0.2,
    });
  },
});

export const setSpeed = mutation({
  args: {
    paused: v.boolean(),
    adminSecret: v.optional(v.string()),
  },
  handler: async (ctx, { paused, adminSecret }) => {
    if (!checkAdmin(adminSecret ?? "")) return;
    const state = await ctx.db.query("worldState").first();
    if (!state) return;
    await ctx.db.patch(state._id, { paused });
  },
});

export const resetWorld = mutation({
  args: {
    adminSecret: v.optional(v.string()),
  },
  handler: async (ctx, { adminSecret }) => {
    if (!checkAdmin(adminSecret ?? "")) return;
    const tables = ["agents", "memories", "relationships", "resources", "inventory",
      "buildings", "buildingInventory", "alliances", "proposals", "trades", "conversations",
      "worldEvents", "reputation", "worldState"] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
  },
});
