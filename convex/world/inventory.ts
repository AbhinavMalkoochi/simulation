import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function addItem(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  itemType: string,
  quantity: number,
): Promise<void> {
  const existing = await ctx.db
    .query("inventory")
    .withIndex("by_agent_item", (q) => q.eq("agentId", agentId).eq("itemType", itemType))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { quantity: existing.quantity + quantity });
  } else {
    await ctx.db.insert("inventory", { agentId, itemType, quantity });
  }
}

export async function removeItem(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  itemType: string,
  quantity: number,
): Promise<boolean> {
  const existing = await ctx.db
    .query("inventory")
    .withIndex("by_agent_item", (q) => q.eq("agentId", agentId).eq("itemType", itemType))
    .first();

  if (!existing || existing.quantity < quantity) return false;

  if (existing.quantity === quantity) {
    await ctx.db.delete(existing._id);
  } else {
    await ctx.db.patch(existing._id, { quantity: existing.quantity - quantity });
  }
  return true;
}

export async function hasItems(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
  items: Array<{ type: string; quantity: number }>,
): Promise<boolean> {
  for (const item of items) {
    const existing = await ctx.db
      .query("inventory")
      .withIndex("by_agent_item", (q) => q.eq("agentId", agentId).eq("itemType", item.type))
      .first();
    if (!existing || existing.quantity < item.quantity) return false;
  }
  return true;
}

export async function getInventory(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
): Promise<Array<{ itemType: string; quantity: number }>> {
  const items = await ctx.db
    .query("inventory")
    .withIndex("by_agent", (q) => q.eq("agentId", agentId))
    .collect();
  return items.map((i) => ({ itemType: i.itemType, quantity: i.quantity }));
}

export const getAgentInventory = internalQuery({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    return getInventory(ctx, agentId);
  },
});
