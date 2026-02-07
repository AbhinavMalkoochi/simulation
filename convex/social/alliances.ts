import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { hasBuildingBonus } from "../world/systems";
import { BUILDING_BONUS } from "../lib/constants";

export const create = internalMutation({
  args: {
    founderId: v.id("agents"),
    name: v.string(),
  },
  handler: async (ctx, { founderId, name }) => {
    const existing = await ctx.db.query("alliances").collect();
    if (existing.find((a) => a.name.toLowerCase() === name.toLowerCase())) {
      return `An alliance named "${name}" already exists.`;
    }

    const founder = await ctx.db.get(founderId);
    if (!founder) return "Agent not found.";

    await ctx.db.insert("alliances", {
      name,
      founderId,
      memberIds: [founderId],
      rules: [],
      description: `Alliance founded by ${founder.name}.`,
    });

    const world = await ctx.db.query("worldState").first();
    await ctx.db.insert("worldEvents", {
      type: "alliance",
      description: `${founder.name} founded the "${name}" alliance.`,
      involvedAgentIds: [founderId],
      tick: world?.tick ?? 0,
    });

    return `Founded the "${name}" alliance.`;
  },
});

export const invite = internalMutation({
  args: {
    inviterId: v.id("agents"),
    targetName: v.string(),
    allianceName: v.string(),
  },
  handler: async (ctx, { inviterId, targetName, allianceName }) => {
    const alliances = await ctx.db.query("alliances").collect();
    const alliance = alliances.find(
      (a) => a.name.toLowerCase() === allianceName.toLowerCase(),
    );
    if (!alliance) return `Alliance "${allianceName}" not found.`;
    if (!alliance.memberIds.includes(inviterId)) return "You are not a member of this alliance.";

    const agents = await ctx.db.query("agents").collect();
    const target = agents.find((a) => a.name.toLowerCase() === targetName.toLowerCase());
    if (!target) return `${targetName} not found.`;
    if (alliance.memberIds.includes(target._id)) return `${targetName} is already a member.`;

    await ctx.db.patch(alliance._id, {
      memberIds: [...alliance.memberIds, target._id],
    });

    const world = await ctx.db.query("worldState").first();
    const tick = world?.tick ?? 0;

    await ctx.db.insert("memories", {
      agentId: target._id,
      type: "observation",
      content: `I was invited to join the "${alliance.name}" alliance.`,
      importance: 7,
      tick,
    });

    await ctx.db.insert("worldEvents", {
      type: "alliance",
      description: `${targetName} joined the "${alliance.name}" alliance.`,
      involvedAgentIds: [inviterId, target._id],
      tick,
    });

    return `${targetName} has joined "${alliance.name}".`;
  },
});

export const proposeRule = internalMutation({
  args: {
    proposerId: v.id("agents"),
    allianceName: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { proposerId, allianceName, content }) => {
    const alliances = await ctx.db.query("alliances").collect();
    const alliance = alliances.find(
      (a) => a.name.toLowerCase() === allianceName.toLowerCase(),
    );
    if (!alliance) return `Alliance "${allianceName}" not found.`;
    if (!alliance.memberIds.includes(proposerId)) return "You are not a member.";

    const world = await ctx.db.query("worldState").first();
    const tick = world?.tick ?? 0;

    await ctx.db.insert("proposals", {
      allianceId: alliance._id,
      proposerId,
      content,
      votes: [{ agentId: proposerId, vote: true }],
      status: "pending",
      tick,
    });

    const proposer = await ctx.db.get(proposerId);
    await ctx.db.insert("worldEvents", {
      type: "governance",
      description: `${proposer?.name ?? "Someone"} proposed a rule for "${alliance.name}": "${content}"`,
      involvedAgentIds: [proposerId],
      tick,
    });

    return `Proposed rule: "${content}" for ${alliance.name}. Awaiting votes.`;
  },
});

export const vote = internalMutation({
  args: {
    voterId: v.id("agents"),
    proposalId: v.id("proposals"),
    voteValue: v.boolean(),
  },
  handler: async (ctx, { voterId, proposalId, voteValue }) => {
    const proposal = await ctx.db.get(proposalId);
    if (!proposal || proposal.status !== "pending") return "Proposal not found or already resolved.";

    const alliance = await ctx.db.get(proposal.allianceId);
    if (!alliance) return "Alliance not found.";
    if (!alliance.memberIds.includes(voterId)) return "You are not a member.";

    if (proposal.votes.find((v) => v.agentId === voterId)) return "You already voted.";

    // MeetingHall bonus: votes near a meetingHall count with extra weight
    const voter = await ctx.db.get(voterId);
    const nearMeetingHall = voter ? await hasBuildingBonus(ctx, voter.position, "meetingHall") : false;
    const voteWeight = nearMeetingHall ? 1 + BUILDING_BONUS.meetingHall.voteWeight : 1;

    const newVotes = [...proposal.votes, { agentId: voterId, vote: voteValue }];
    // Count effective votes with weights
    let yesCount = 0;
    let noCount = 0;
    for (const v of newVotes) {
      const isCurrentVoter = v.agentId === voterId;
      const weight = isCurrentVoter ? voteWeight : 1;
      if (v.vote) yesCount += weight;
      else noCount += weight;
    }
    const majority = Math.ceil(alliance.memberIds.length / 2);

    let newStatus: "pending" | "passed" | "rejected" = "pending";
    if (yesCount >= majority) newStatus = "passed";
    else if (noCount >= majority) newStatus = "rejected";

    await ctx.db.patch(proposalId, { votes: newVotes, status: newStatus });

    if (newStatus === "passed") {
      await ctx.db.patch(alliance._id, {
        rules: [...alliance.rules, proposal.content],
      });

      const world = await ctx.db.query("worldState").first();
      await ctx.db.insert("worldEvents", {
        type: "governance",
        description: `Rule passed in "${alliance.name}": "${proposal.content}"`,
        involvedAgentIds: alliance.memberIds,
        tick: world?.tick ?? 0,
      });
    }

    return `Vote cast: ${voteValue ? "yes" : "no"}. Status: ${newStatus}.`;
  },
});
