import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

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

export async function getRelationshipsFor(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
): Promise<Array<{ targetAgentId: Id<"agents">; trust: number; affinity: number; interactionCount: number }>> {
  return ctx.db
    .query("relationships")
    .withIndex("by_agent", (q) => q.eq("agentId", agentId))
    .collect();
}

export async function getReputation(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
): Promise<number> {
  const incoming = await ctx.db.query("relationships").collect();
  const aboutMe = incoming.filter((r) => r.targetAgentId === agentId);
  if (aboutMe.length === 0) return 0;
  return aboutMe.reduce((sum, r) => sum + r.trust, 0) / aboutMe.length;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
