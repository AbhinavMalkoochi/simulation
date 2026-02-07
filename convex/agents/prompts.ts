type Personality = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

type Memory = { content: string; tick: number; type: string; importance: number };
type NearbyAgent = { name: string; position: { x: number; y: number }; status: string };
type NearbyResource = { type: string; tileX: number; tileY: number; quantity: number };
type Conversation = {
  messages: Array<{ speakerId: string; content: string; tick: number }>;
  participantIds: string[];
};

const TRAIT_DESC: Record<string, { high: string; low: string }> = {
  openness: {
    high: "You are deeply curious, imaginative, and drawn to new experiences.",
    low: "You prefer routine and practical approaches. You value tradition.",
  },
  conscientiousness: {
    high: "You are organized, disciplined, and follow through on commitments.",
    low: "You are spontaneous and flexible, preferring to go with the flow.",
  },
  extraversion: {
    high: "You are energized by social interaction and enjoy being around others.",
    low: "You prefer solitude and quiet reflection. You recharge through alone time.",
  },
  agreeableness: {
    high: "You are compassionate, cooperative, and prioritize harmony.",
    low: "You are direct and competitive. You speak your mind freely.",
  },
  neuroticism: {
    high: "You experience emotions intensely and are prone to worry.",
    low: "You are emotionally stable and calm under pressure.",
  },
};

function describePersonality(p: Personality): string {
  return Object.entries(p)
    .map(([trait, score]) => {
      const desc = TRAIT_DESC[trait];
      if (!desc) return "";
      return score > 0.6 ? desc.high : score < 0.4 ? desc.low : "";
    })
    .filter(Boolean)
    .join(" ");
}

import { formatTime } from "../lib/utils";

function describeMood(valence: number, arousal: number): string {
  if (valence > 0.3 && arousal > 0.5) return "excited and happy";
  if (valence > 0.3 && arousal <= 0.5) return "content and peaceful";
  if (valence < -0.3 && arousal > 0.5) return "anxious and upset";
  if (valence < -0.3 && arousal <= 0.5) return "sad and withdrawn";
  if (arousal > 0.7) return "alert and energized";
  return "calm and neutral";
}

function formatPlanSection(agent: {
  currentPlan?: string;
  planSteps?: string[];
  planStep?: number;
}): string {
  if (agent.planSteps && agent.planStep !== undefined) {
    const lines = agent.planSteps.map((step, i) => {
      if (i < agent.planStep!) return `  ${i + 1}. [done] ${step}`;
      if (i === agent.planStep!) return `  ${i + 1}. [CURRENT] ${step}`;
      return `  ${i + 1}. [ ] ${step}`;
    });
    return `- ACTIVE PLAN (step ${agent.planStep + 1}/${agent.planSteps.length}):\n${lines.join("\n")}`;
  }
  return agent.currentPlan ? `- Current plan: ${agent.currentPlan}` : "- No current plan.";
}

type InventoryItem = { itemType: string; quantity: number };
type NearbyBuilding = { type: string; posX: number; posY: number };
type Relationship = { targetAgentId: string; trust: number; affinity: number };
type LastSighting = { name: string; position: { x: number; y: number }; ticksAgo: number };
type Alliance = { name: string; memberIds: string[]; rules: string[] };
type PendingProposal = { _id: string; content: string; allianceName?: string };
type PendingTrade = { offer: Array<{ itemType: string; quantity: number }>; request: Array<{ itemType: string; quantity: number }>; initiatorName?: string };

interface BuildPromptArgs {
  agent: {
    name: string;
    backstory: string;
    personality: Personality;
    position: { x: number; y: number };
    energy: number;
    emotion: { valence: number; arousal: number };
    status: string;
    currentPlan?: string;
    planSteps?: string[];
    planStep?: number;
    _id: string;
  };
  memories: Memory[];
  nearbyAgents: NearbyAgent[];
  nearbyResources: NearbyResource[];
  pendingConversations: Conversation[];
  inventory: InventoryItem[];
  nearbyBuildings: NearbyBuilding[];
  relationships: Relationship[];
  myAlliances: Alliance[];
  pendingProposals: PendingProposal[];
  pendingTrades: PendingTrade[];
  lastSightings: LastSighting[];
  timeOfDay: number;
  weather: string;
  tick: number;
}

export function buildSystemPrompt(args: BuildPromptArgs): string {
  const {
    agent, memories, nearbyAgents, nearbyResources, pendingConversations,
    inventory, nearbyBuildings, relationships, myAlliances, pendingProposals, pendingTrades,
    lastSightings, timeOfDay, weather, tick,
  } = args;

  const personalityDesc = describePersonality(agent.personality);
  const mood = describeMood(agent.emotion.valence, agent.emotion.arousal);

  const memoryLines = memories
    .slice(0, 12)
    .map((m) => `- [tick ${m.tick}, ${m.type}] ${m.content}`)
    .join("\n");

  const nearbyAgentLines = nearbyAgents.length > 0
    ? nearbyAgents.map((a) => `- ${a.name} at (${a.position.x}, ${a.position.y}) — ${a.status}`).join("\n")
    : "Nobody nearby.";

  const resourceLines = nearbyResources.length > 0
    ? nearbyResources.map((r) => `- ${r.type} at (${r.tileX}, ${r.tileY}) — ${r.quantity} available`).join("\n")
    : "No visible resources nearby.";

  const convLines = pendingConversations.flatMap((c) =>
    c.messages
      .filter((m) => m.speakerId !== agent._id)
      .map((m) => `- Someone said: "${m.content}"`)
  );
  const convSection = convLines.length > 0
    ? `\nSOMEONE SPOKE TO YOU:\n${convLines.join("\n")}\n`
    : "";

  return `You are ${agent.name}. You live in a wilderness world alongside other people. You are a person with feelings, desires, and a unique way of seeing the world. Stay in character at all times.

ABOUT YOU:
${agent.backstory}

YOUR PERSONALITY:
${personalityDesc}

CURRENT STATE:
- Position: (${agent.position.x}, ${agent.position.y})
- Energy: ${agent.energy}%
- Feeling: ${mood}
- Time: ${formatTime(timeOfDay)} (tick ${tick})
- Status: ${agent.status}
${formatPlanSection(agent)}

NEARBY PEOPLE:
${nearbyAgentLines}

${lastSightings.length > 0 ? `PEOPLE YOU REMEMBER SEEING:\n${lastSightings.map((s) => `- ${s.name} last seen at (${s.position.x}, ${s.position.y}) — ${s.ticksAgo} ticks ago`).join("\n")}\n` : ""}NEARBY RESOURCES:
${resourceLines}

NEARBY BUILDINGS:
${nearbyBuildings.length > 0 ? nearbyBuildings.map((b) => `- ${b.type} at (${b.posX}, ${b.posY})`).join("\n") : "No buildings nearby."}

YOUR INVENTORY:
${inventory.length > 0 ? inventory.map((i) => `- ${i.quantity} ${i.itemType}`).join("\n") : "Empty."}

WEATHER: ${weather}

YOUR RELATIONSHIPS:
${relationships.length > 0 ? relationships.map((r) => `- Agent ${r.targetAgentId}: trust ${r.trust.toFixed(2)}, affinity ${r.affinity.toFixed(2)}`).join("\n") : "No established relationships."}

YOUR ALLIANCES:
${myAlliances.length > 0 ? myAlliances.map((a) => `- "${a.name}" (${a.memberIds.length} members)${a.rules.length > 0 ? ` Rules: ${a.rules.join("; ")}` : ""}`).join("\n") : "None."}
${pendingProposals.length > 0 ? `\nPENDING PROPOSALS TO VOTE ON:\n${pendingProposals.map((p) => `- [id: ${p._id}] "${p.content}" (in ${p.allianceName ?? "unknown alliance"})`).join("\n")}` : ""}
${pendingTrades.length > 0 ? `\nPENDING TRADE OFFERS:\n${pendingTrades.map((t) => `- ${t.initiatorName ?? "Someone"} offers ${t.offer.map((o) => `${o.quantity} ${o.itemType}`).join(", ")} for ${t.request.map((r) => `${r.quantity} ${r.itemType}`).join(", ")}`).join("\n")}` : ""}
${convSection}
YOUR MEMORIES (most relevant first):
${memoryLines || "No memories yet."}

${agent.energy < 15 ? "CRITICAL: You are starving! You must eat food or rest IMMEDIATELY or you will collapse.\n" : agent.energy < 30 ? "WARNING: You are hungry. Eat food or rest soon before your energy runs out.\n" : ""}Decide what to do next. Consider your personality, relationships, alliances, and what would be most interesting or useful. Use the available tools to take action. Be concise.`;
}

export function buildConversationPrompt(
  agent: { name: string; backstory: string; personality: Personality; emotion: { valence: number; arousal: number } },
  partnerName: string,
  messages: Array<{ speakerName: string; content: string }>,
): string {
  const personalityDesc = describePersonality(agent.personality);
  const mood = describeMood(agent.emotion.valence, agent.emotion.arousal);
  const messageLines = messages.map((m) => `${m.speakerName}: "${m.content}"`).join("\n");

  return `You are ${agent.name}. ${agent.backstory}

YOUR PERSONALITY: ${personalityDesc}
YOUR MOOD: ${mood}

${partnerName} is talking to you. Here is the conversation so far:
${messageLines}

Respond naturally in character. You may:
- Use the speak tool to reply to ${partnerName}
- Use the think tool to record a private thought
- Use the setPlan tool if the conversation inspires a new goal

Keep your response brief and natural (1-2 sentences). Be genuine to your personality.`;
}

export function buildReflectionPrompt(
  agentName: string,
  memories: Memory[],
): string {
  const lines = memories.map((m) => `- [${m.type}] ${m.content}`).join("\n");

  return `You are ${agentName}. Look back on your recent experiences and write 2-3 high-level reflections or insights. Each reflection should synthesize multiple memories into a broader understanding about yourself, others, or the world.

RECENT EXPERIENCES:
${lines}

Write each reflection as a single clear sentence starting with "I" — for example:
"I notice that I enjoy spending time near the river."
"I think Kai is someone I can trust."

Reflections:`;
}
