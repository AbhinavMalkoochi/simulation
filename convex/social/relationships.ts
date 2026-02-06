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
}
