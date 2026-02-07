import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export async function updateRelationship(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  targetId: Id<"agents">,
  trustDelta: number,
  affinityDelta: number,
  tick: number,
): Promise<void> {
  const existing = await ctx.db
    .query("relationships")
    .withIndex("by_pair", (q) => q.eq("agentId", agentId).eq("targetAgentId", targetId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      trust: clamp(existing.trust + trustDelta, -1, 1),
      affinity: clamp(existing.affinity + affinityDelta, -1, 1),
      interactionCount: existing.interactionCount + 1,
      lastInteractionTick: tick,
    });
  } else {
    await ctx.db.insert("relationships", {
      agentId,
      targetAgentId: targetId,
      trust: clamp(0.1 + trustDelta, -1, 1),
      affinity: clamp(affinityDelta, -1, 1),
      interactionCount: 1,
      lastInteractionTick: tick,
    });
  }

  // Recalculate reputation for the target (they are being rated by others)
  await recalculateReputation(ctx, targetId, tick);
}

/** Recalculate an agent's reputation as the average trust from all incoming relationships */
export async function recalculateReputation(
  ctx: MutationCtx,
  agentId: Id<"agents">,
  tick: number,
): Promise<void> {
  const incoming = await ctx.db
    .query("relationships")
    .filter((q) => q.eq(q.field("targetAgentId"), agentId))
    .collect();

  if (incoming.length === 0) return;

  const avgTrust = incoming.reduce((sum, r) => sum + r.trust, 0) / incoming.length;
  const score = clamp(avgTrust, -1, 1);

  const existing = await ctx.db
    .query("reputation")
    .withIndex("by_agent", (q) => q.eq("agentId", agentId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { score, lastUpdated: tick });
  } else {
    await ctx.db.insert("reputation", { agentId, score, lastUpdated: tick });
  }
}
