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

const TRAIT_DESC: Record<string, { high: string; midHigh: string; midLow: string; low: string }> = {
  openness: {
    high: "You are deeply curious, imaginative, and drawn to new experiences. You love exploring ideas and the unknown.",
    midHigh: "You appreciate novelty and enjoy trying new things, though you balance it with practicality.",
    midLow: "You lean toward the familiar and prefer tested approaches, but can adapt when needed.",
    low: "You prefer routine, tradition, and practical approaches. You trust what has been proven to work.",
  },
  conscientiousness: {
    high: "You are highly organized, disciplined, and follow through on every commitment without fail.",
    midHigh: "You are generally reliable and structured, though you allow yourself flexibility when it makes sense.",
    midLow: "You tend toward spontaneity and flexibility, sometimes at the cost of follow-through.",
    low: "You are spontaneous and go with the flow. Structure feels constraining to you.",
  },
  extraversion: {
    high: "You are energized by social interaction, love being around others, and naturally take the lead in groups.",
    midHigh: "You enjoy socializing and connecting with others, though you also value some quiet time.",
    midLow: "You are somewhat reserved, preferring smaller groups or one-on-one interactions over crowds.",
    low: "You prefer solitude and quiet reflection. Being around too many people drains you.",
  },
  agreeableness: {
    high: "You are deeply compassionate, cooperative, and always prioritize harmony and helping others.",
    midHigh: "You are generally warm and cooperative, willing to compromise to keep the peace.",
    midLow: "You can be skeptical of others' motives and don't shy away from disagreement when needed.",
    low: "You are blunt, competitive, and speak your mind freely regardless of how it lands.",
  },
  neuroticism: {
    high: "You experience emotions intensely — worry, anxiety, and frustration hit you hard.",
    midHigh: "You are somewhat sensitive to stress and can get anxious when things feel uncertain.",
    midLow: "You handle most stress well, though big setbacks can shake your composure.",
    low: "You are emotionally steady and calm under pressure. Very little rattles you.",
  },
};

function describePersonality(p: Personality): string {
  return Object.entries(p)
    .map(([trait, score]) => {
      const desc = TRAIT_DESC[trait];
      if (!desc) return "";
      if (score >= 0.7) return desc.high;
      if (score >= 0.5) return desc.midHigh;
      if (score >= 0.3) return desc.midLow;
      return desc.low;
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
    communicationStyle?: string;
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
  storehouseInventory: InventoryItem[];
  reputations: Array<{ name: string; score: number }>;
  timeOfDay: number;
  weather: string;
  tick: number;
}

export function buildSystemPrompt(args: BuildPromptArgs): string {
  const {
    agent, memories, nearbyAgents, nearbyResources, pendingConversations,
    inventory, nearbyBuildings, relationships, myAlliances, pendingProposals, pendingTrades,
    lastSightings, storehouseInventory, reputations, timeOfDay, weather, season, day, tick,
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

  return `You are ${agent.name}. You live in a shared wilderness world alongside other people. You are a real person with feelings, desires, and a unique way of seeing the world. Stay in character at all times.

WORLD RULES:
- You live on a 50x50 tile wilderness with varied terrain: grass, forest, stone, sand, and water (impassable).
- It is Day ${day}, ${season}. Time: ${formatTime(timeOfDay)}. Weather: ${weather}.
- You can GATHER resources (wood, stone, food, herbs, metal) from nearby tiles.
- You can CRAFT items: wooden_plank (3 wood), stone_tools (2 stone + 1 wood), meal (2 food), medicine (3 herbs), metal_tools (2 metal + 1 wood), rope (2 herbs + 1 wood).
- You can BUILD structures: shelter, workshop, market, farm, storehouse, meeting hall.
- You can TRADE with nearby people, FORM ALLIANCES, propose rules, and vote on governance.
- You can SPEAK to nearby people to build relationships, coordinate, and share knowledge.
- Energy depletes over time. Eat food/meals to recover, or rest/sleep.
- Night is dark. Shelters provide better rest. Seasons affect resource availability.

ABOUT YOU:
${agent.backstory}

YOUR PERSONALITY:
${personalityDesc}
${agent.communicationStyle ? `\nYOUR COMMUNICATION STYLE:\n${agent.communicationStyle}` : ""}

CURRENT STATE:
- Position: (${agent.position.x}, ${agent.position.y})
- Energy: ${agent.energy}%
- Feeling: ${mood}
- Day ${day}, ${season} — ${formatTime(timeOfDay)}
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
${storehouseInventory.length > 0 ? `\nALLIANCE STOREHOUSE (nearby):\n${storehouseInventory.map((i) => `- ${i.quantity} ${i.itemType}`).join("\n")}` : ""}

YOUR RELATIONSHIPS:
${relationships.length > 0 ? relationships.map((r) => `- ${r.targetAgentId}: trust ${r.trust.toFixed(2)}, affinity ${r.affinity.toFixed(2)}`).join("\n") : "No established relationships."}

${reputations.length > 0 ? `COMMUNITY REPUTATION:\n${reputations.map((r) => {
  const label = r.score > 0.3 ? "well-trusted" : r.score > 0 ? "neutral-positive" : r.score > -0.3 ? "neutral-negative" : "distrusted";
  return `- ${r.name}: ${label} (${r.score.toFixed(2)})`;
}).join("\n")}` : ""}
YOUR ALLIANCES:
${myAlliances.length > 0 ? myAlliances.map((a) => `- "${a.name}" (${a.memberIds.length} members)${a.rules.length > 0 ? ` Rules: ${a.rules.join("; ")}` : ""}`).join("\n") : "None."}
${pendingProposals.length > 0 ? `\nPENDING PROPOSALS TO VOTE ON:\n${pendingProposals.map((p) => `- [id: ${p._id}] "${p.content}" (in ${p.allianceName ?? "unknown alliance"})`).join("\n")}` : ""}
${pendingTrades.length > 0 ? `\nPENDING TRADE OFFERS:\n${pendingTrades.map((t) => `- ${t.initiatorName ?? "Someone"} offers ${t.offer.map((o) => `${o.quantity} ${o.itemType}`).join(", ")} for ${t.request.map((r) => `${r.quantity} ${r.itemType}`).join(", ")}`).join("\n")}` : ""}
${convSection}
YOUR MEMORIES (most relevant first):
${memoryLines || "No memories yet."}

${agent.energy < 15 ? "CRITICAL: You are starving! You must eat food or rest IMMEDIATELY or you will collapse.\n" : agent.energy < 30 ? "WARNING: You are hungry. Eat food or rest soon before your energy runs out.\n" : ""}Decide what to do next. Consider your personality, relationships, alliances, and what would be most interesting or useful. Use the available tools to take action. Be concise and stay in character.`;
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
