import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { addItem, removeItem, hasItems } from "../world/inventory";
import { updateRelationship } from "./relationships";
import { hasBuildingBonus } from "../world/systems";
import { BUILDING_BONUS, PERCEPTION } from "../lib/constants";

export const propose = internalMutation({
  args: {
    initiatorId: v.id("agents"),
    targetName: v.string(),
    offerType: v.string(),
    offerQty: v.number(),
    requestType: v.string(),
    requestQty: v.number(),
  },
  handler: async (ctx, { initiatorId, targetName, offerType, offerQty, requestType, requestQty }) => {
    const initiator = await ctx.db.get(initiatorId);
    if (!initiator) return "Agent not found.";

    // Market building extends trade range
    const nearMarket = await hasBuildingBonus(ctx, initiator.position, "market");
    const tradeRange = nearMarket ? BUILDING_BONUS.market.tradeRangeBoost : PERCEPTION.SPEAK_RANGE;

    const agents = await ctx.db.query("agents").collect();
    const target = agents.find(
      (a) =>
        a.name.toLowerCase() === targetName.toLowerCase() &&
        Math.abs(a.position.x - initiator.position.x) <= tradeRange &&
        Math.abs(a.position.y - initiator.position.y) <= tradeRange,
    );
    if (!target) return `${targetName} is not nearby.`;

    const canOffer = await hasItems(ctx, initiatorId, [{ type: offerType, quantity: offerQty }]);
    if (!canOffer) return `You don't have ${offerQty} ${offerType} to offer.`;

    const world = await ctx.db.query("worldState").first();
    const tick = world?.tick ?? 0;

    await ctx.db.insert("trades", {
      initiatorId,
      responderId: target._id,
      offer: [{ itemType: offerType, quantity: offerQty }],
      request: [{ itemType: requestType, quantity: requestQty }],
      status: "pending",
      tick,
    });

    await ctx.db.insert("memories", {
      agentId: target._id,
      type: "observation",
      content: `${initiator.name} offered me ${offerQty} ${offerType} for ${requestQty} ${requestType}.`,
      importance: 6,
      tick,
    });

    await ctx.db.insert("worldEvents", {
      type: "trade",
      description: `${initiator.name} proposed a trade to ${target.name}: ${offerQty} ${offerType} for ${requestQty} ${requestType}.`,
      involvedAgentIds: [initiatorId, target._id],
      tick,
    });

    return `Trade proposed to ${target.name}: ${offerQty} ${offerType} for ${requestQty} ${requestType}.`;
  },
});

export const respond = internalMutation({
  args: {
    responderId: v.id("agents"),
    accept: v.boolean(),
  },
  handler: async (ctx, { responderId, accept }) => {
    const pendingTrades = await ctx.db
      .query("trades")
      .withIndex("by_responder", (q) => q.eq("responderId", responderId))
      .collect();

    const trade = pendingTrades.find((t) => t.status === "pending");
    if (!trade) return "No pending trade offers.";

    const world = await ctx.db.query("worldState").first();
    const tick = world?.tick ?? 0;

    if (!accept) {
      await ctx.db.patch(trade._id, { status: "rejected" });
      await updateRelationship(ctx, responderId, trade.initiatorId, -0.05, -0.02, tick);
      return "Trade rejected.";
    }

    const canRespond = await hasItems(
      ctx,
      responderId,
      trade.request.map((r) => ({ type: r.itemType, quantity: r.quantity })),
    );
    if (!canRespond) {
      await ctx.db.patch(trade._id, { status: "rejected" });
      return "You don't have the requested items.";
    }

    const canOffer = await hasItems(
      ctx,
      trade.initiatorId,
      trade.offer.map((o) => ({ type: o.itemType, quantity: o.quantity })),
    );
    if (!canOffer) {
      await ctx.db.patch(trade._id, { status: "expired" });
      return "The initiator no longer has the offered items.";
    }

    for (const item of trade.offer) {
      await removeItem(ctx, trade.initiatorId, item.itemType, item.quantity);
      await addItem(ctx, responderId, item.itemType, item.quantity);
    }
    for (const item of trade.request) {
      await removeItem(ctx, responderId, item.itemType, item.quantity);
      await addItem(ctx, trade.initiatorId, item.itemType, item.quantity);
    }

    await ctx.db.patch(trade._id, { status: "accepted" });

    await updateRelationship(ctx, responderId, trade.initiatorId, 0.1, 0.1, tick);
    await updateRelationship(ctx, trade.initiatorId, responderId, 0.1, 0.1, tick);

    const initiator = await ctx.db.get(trade.initiatorId);
    const responder = await ctx.db.get(responderId);

    await ctx.db.insert("worldEvents", {
      type: "trade",
      description: `Trade completed between ${initiator?.name} and ${responder?.name}.`,
      involvedAgentIds: [trade.initiatorId, responderId],
      tick,
    });

    return "Trade accepted! Items exchanged.";
  },
});
