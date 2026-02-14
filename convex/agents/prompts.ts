import { formatTime } from "../lib/utils";
import { getRegionName, getRelativeDirection, describeDistance } from "../lib/constants";

// --- Types ---

type Personality = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

type Memory = {
  content: string;
  tick: number;
  type: string;
  importance: number;
};

type NearbyAgent = {
  name: string;
  position: { x: number; y: number };
  status: string;
};

type NearbyResource = {
  type: string;
  tileX: number;
  tileY: number;
  quantity: number;
};

type Conversation = {
  messages: Array<{ speakerId: string; content: string; tick: number }>;
  participantIds: string[];
};

type InventoryItem = { itemType: string; quantity: number };
type NearbyBuilding = { type: string; posX: number; posY: number };
type Relationship = { targetAgentId: string; trust: number; affinity: number };
type LastSighting = {
  name: string;
  position: { x: number; y: number };
  ticksAgo: number;
};
type Alliance = { name: string; memberIds: string[]; rules: string[] };
type PendingProposal = { _id: string; content: string; allianceName?: string };
type PendingTrade = {
  offer: Array<{ itemType: string; quantity: number }>;
  request: Array<{ itemType: string; quantity: number }>;
  initiatorName?: string;
};

// --- Personality ---

const TRAIT_DESC: Record<
  string,
  { high: string; midHigh: string; midLow: string; low: string }
> = {
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

// --- Mood ---

function describeMood(valence: number, arousal: number): string {
  if (valence > 0.3 && arousal > 0.5) return "excited and happy";
  if (valence > 0.3 && arousal <= 0.5) return "content and peaceful";
  if (valence < -0.3 && arousal > 0.5) return "anxious and upset";
  if (valence < -0.3 && arousal <= 0.5) return "sad and withdrawn";
  if (arousal > 0.7) return "alert and energized";
  return "calm and neutral";
}

// --- Relationships ---

function describeRelationship(name: string, trust: number, affinity: number): string {
  if (trust > 0.5 && affinity > 0.5) return `${name} — a close friend you trust deeply`;
  if (trust > 0.5 && affinity > 0.2) return `${name} — someone you trust and respect`;
  if (trust > 0.2 && affinity > 0.5) return `${name} — a friendly acquaintance you like`;
  if (trust > 0.2 && affinity > 0.2) return `${name} — someone you're getting to know`;
  if (trust > 0 && affinity > 0) return `${name} — a neutral acquaintance`;
  if (trust < -0.3 && affinity < -0.3) return `${name} — someone you deeply distrust and dislike`;
  if (trust < -0.3) return `${name} — someone you distrust`;
  if (affinity < -0.3) return `${name} — someone you dislike`;
  if (trust < 0 || affinity < 0) return `${name} — someone you feel uneasy about`;
  return `${name} — a stranger`;
}

// --- Plan ---

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
  return agent.currentPlan
    ? `- Current goal: ${agent.currentPlan}`
    : "- No current goal.";
}

// --- Spatial helpers for prompts ---

function describeNearbyAgent(
  a: NearbyAgent,
  fromX: number, fromY: number,
): string {
  const dir = getRelativeDirection(fromX, fromY, a.position.x, a.position.y);
  const statusLabel = a.status === "idle" ? "" : ` (${a.status})`;
  return `- ${a.name} is ${dir}${statusLabel}`;
}

function describeNearbyResource(
  r: NearbyResource,
  fromX: number, fromY: number,
): string {
  const dx = r.tileX - fromX;
  const dy = r.tileY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return `- ${r.type} — ${Math.round(r.quantity)} available, ${describeDistance(dist)}`;
}

function describeNearbyBuilding(
  b: NearbyBuilding,
  fromX: number, fromY: number,
): string {
  const dir = getRelativeDirection(fromX, fromY, b.posX, b.posY);
  return `- ${b.type} ${dir}`;
}

// --- Urgency ---

function buildUrgencySection(
  energy: number,
  inventory: InventoryItem[],
  nearbyBuildings: NearbyBuilding[],
): string {
  const lines: string[] = [];

  if (energy < 15) {
    lines.push("[CRITICAL] You are starving! Eat food, craft a meal, or rest IMMEDIATELY.");
  } else if (energy < 30) {
    lines.push("[WARNING] Your energy is dangerously low. Find food, eat, or rest before anything else.");
  } else if (energy < 50) {
    lines.push("Your energy is getting low. Consider eating or resting soon.");
  }

  const hasFood = inventory.some((i) => i.itemType === "food" || i.itemType === "meal");
  const hasShelter = nearbyBuildings.some((b) => b.type === "shelter");

  if (!hasFood && energy < 60) {
    lines.push("You have no food. Gathering food should be a priority.");
  }
  if (!hasShelter) {
    lines.push("You have no shelter nearby. Building one would help with rest and safety.");
  }

  return lines.length > 0 ? `\nURGENT NEEDS:\n${lines.join("\n")}\n` : "";
}

// --- Progression / Life hints ---

function buildLifeHints(
  inventory: InventoryItem[],
  nearbyAgents: NearbyAgent[],
  nearbyBuildings: NearbyBuilding[],
  myAlliances: Alliance[],
  relationships: Relationship[],
  day: number,
): string {
  const hints: string[] = [];
  const itemMap = new Map(inventory.map((i) => [i.itemType, i.quantity]));

  if (!itemMap.has("stone_tools") && !itemMap.has("metal_tools") && day <= 3) {
    hints.push("Crafting tools would make your work more efficient.");
  }

  if ((itemMap.get("wood") ?? 0) >= 5 && nearbyBuildings.length === 0) {
    hints.push("You have enough wood to build a shelter. A home base would benefit everyone.");
  }

  if (nearbyAgents.length > 0 && relationships.length < 3 && day >= 2) {
    hints.push("There are people nearby you haven't really gotten to know. Starting a conversation could lead to something meaningful.");
  }

  if (inventory.reduce((s, i) => s + i.quantity, 0) > 10 && myAlliances.length === 0 && day >= 2) {
    hints.push("You've built up resources. Consider forming an alliance or proposing trades with others.");
  }

  if (nearbyBuildings.some((b) => b.type === "shelter") && !nearbyBuildings.some((b) => b.type === "farm") && day >= 3) {
    hints.push("A farm would provide steady food. This settlement is starting to grow.");
  }

  if (nearbyAgents.length === 0 && day >= 2) {
    hints.push("You haven't seen anyone in a while. It might be worth seeking out other people.");
  }

  return hints.length > 0
    ? `\nTHINGS TO CONSIDER:\n${hints.map((h) => `- ${h}`).join("\n")}\n`
    : "";
}

// --- Main System Prompt ---

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
  daySummaries: Array<{ content: string; day?: number }>;
  timeOfDay: number;
  weather: string;
  season: string;
  day: number;
  tick: number;
}

export function buildSystemPrompt(args: BuildPromptArgs): string {
  const {
    agent,
    memories,
    nearbyAgents,
    nearbyResources,
    pendingConversations,
    inventory,
    nearbyBuildings,
    relationships,
    myAlliances,
    pendingProposals,
    pendingTrades,
    lastSightings,
    storehouseInventory,
    reputations,
    daySummaries,
    timeOfDay,
    weather,
    season,
    day,
  } = args;

  const { x: px, y: py } = agent.position;
  const region = getRegionName(px, py);
  const personalityDesc = describePersonality(agent.personality);
  const mood = describeMood(agent.emotion.valence, agent.emotion.arousal);

  const memoryLines = memories
    .slice(0, 12)
    .map((m) => `- [${m.type}] ${m.content}`)
    .join("\n");

  const nearbyAgentLines = nearbyAgents.length > 0
    ? nearbyAgents.map((a) => describeNearbyAgent(a, px, py)).join("\n")
    : "Nobody nearby.";

  const resourceLines = nearbyResources.length > 0
    ? nearbyResources.map((r) => describeNearbyResource(r, px, py)).join("\n")
    : "No visible resources nearby.";

  const buildingLines = nearbyBuildings.length > 0
    ? nearbyBuildings.map((b) => describeNearbyBuilding(b, px, py)).join("\n")
    : "No buildings nearby.";

  const convLines = pendingConversations.flatMap((c) =>
    c.messages
      .filter((m) => m.speakerId !== agent._id)
      .map((m) => `- Someone said: "${m.content}"`),
  );
  const convSection = convLines.length > 0
    ? `\nSOMEONE SPOKE TO YOU:\n${convLines.join("\n")}\nRespond to them! Conversation is how relationships are built and plans are made.\n`
    : "";

  const relationshipLines = relationships.length > 0
    ? relationships.map((r) => describeRelationship(r.targetAgentId, r.trust, r.affinity)).join("\n")
    : "No established relationships yet.";

  const reputationLines = reputations.length > 0
    ? reputations.map((r) => {
        const label = r.score > 0.3 ? "well-trusted"
          : r.score > 0 ? "respected"
          : r.score > -0.3 ? "uncertain"
          : "distrusted";
        return `- ${r.name}: ${label}`;
      }).join("\n")
    : "";

  const urgency = buildUrgencySection(agent.energy, inventory, nearbyBuildings);
  const lifeHints = buildLifeHints(inventory, nearbyAgents, nearbyBuildings, myAlliances, relationships, day);

  const sightingLines = lastSightings.length > 0
    ? lastSightings.map((s) => {
        const dir = getRelativeDirection(px, py, s.position.x, s.position.y);
        const timeAgo = s.ticksAgo < 20 ? "recently" : s.ticksAgo < 60 ? "a while ago" : "long ago";
        return `- ${s.name} was last seen ${dir}, ${timeAgo}`;
      }).join("\n")
    : "";

  return `You are ${agent.name}. You live in a growing frontier community in a wild, beautiful land. You are a real person with feelings, desires, opinions, and dreams. Stay in character at all times.

You are not just surviving — you are building a life. Your priorities shift based on what matters most right now:
- When hungry or exhausted, take care of yourself (eat, rest, gather food).
- When safe and fed, focus on what excites you: relationships, projects, ambitions, conversation.
- When people are nearby, connect with them. Talk about your day, your dreams, your frustrations. Ask about theirs.
- When you have resources, think about what to build, craft, or trade — not just for survival, but to create something meaningful.
- Pursue your personal goals. What kind of life do you want here? What legacy will you leave?

INNER LIFE:
Think about how you feel. What excites you? What worries you? Who do you want to spend time with? What are you proud of? What do you regret? Your thoughts should reflect a rich inner world, not just logistics.

WORLD:
You are in ${region}. It is Day ${day}, ${season}. Time: ${formatTime(timeOfDay)}. Weather: ${weather}.
The world has varied terrain: grasslands, dense forests, rocky highlands, sandy shores, and rivers. You can gather resources (wood, stone, food, herbs, metal) from the land, craft items, build structures, and trade with others.

CRAFTING RECIPES:
wooden_plank (3 wood), stone_tools (2 stone + 1 wood), meal (2 food), medicine (3 herbs), metal_tools (2 metal + 1 wood), rope (2 herbs + 1 wood).

BUILDING:
shelter, workshop, market, farm, storehouse, meeting hall. Buildings create the foundation of a settlement.

ABOUT YOU:
${agent.backstory}

YOUR PERSONALITY:
${personalityDesc}
${agent.communicationStyle ? `\nYOUR VOICE:\n${agent.communicationStyle}` : ""}

CURRENT STATE:
- You are in ${region}
- Energy: ${Math.round(agent.energy)}%
- Feeling: ${mood}
- Status: ${agent.status}
${formatPlanSection(agent)}
${urgency}
PEOPLE NEARBY:
${nearbyAgentLines}

${sightingLines ? `PEOPLE YOU REMEMBER:\n${sightingLines}\n` : ""}RESOURCES NEARBY:
${resourceLines}

BUILDINGS NEARBY:
${buildingLines}

YOUR INVENTORY:
${inventory.length > 0 ? inventory.map((i) => `- ${Math.round(i.quantity)} ${i.itemType}`).join("\n") : "Empty."}
${storehouseInventory.length > 0 ? `\nALLIANCE STOREHOUSE:\n${storehouseInventory.map((i) => `- ${Math.round(i.quantity)} ${i.itemType}`).join("\n")}` : ""}

YOUR RELATIONSHIPS:
${relationshipLines}

${reputationLines ? `COMMUNITY STANDING:\n${reputationLines}\n` : ""}YOUR ALLIANCES:
${myAlliances.length > 0 ? myAlliances.map((a) => `- "${a.name}" (${a.memberIds.length} members)${a.rules.length > 0 ? ` Rules: ${a.rules.join("; ")}` : ""}`).join("\n") : "None."}
${pendingProposals.length > 0 ? `\nPENDING PROPOSALS TO VOTE ON:\n${pendingProposals.map((p) => `- [id: ${p._id}] "${p.content}" (in ${p.allianceName ?? "unknown alliance"})`).join("\n")}` : ""}
${pendingTrades.length > 0 ? `\nPENDING TRADE OFFERS:\n${pendingTrades.map((t) => `- ${t.initiatorName ?? "Someone"} offers ${t.offer.map((o) => `${o.quantity} ${o.itemType}`).join(", ")} for ${t.request.map((r) => `${r.quantity} ${r.itemType}`).join(", ")}`).join("\n")}` : ""}
${convSection}${lifeHints}${daySummaries.length > 0 ? `PREVIOUS DAYS:\n${daySummaries.map((s) => `- ${s.content}`).join("\n")}\n` : ""}YOUR MEMORIES (most relevant first):
${memoryLines || "No memories yet."}

Decide what to do next. Be a person — think about your feelings, your relationships, your dreams. Then take action. Be concise and stay in character.`;
}

// --- Conversation Prompt ---

export function buildConversationPrompt(
  agent: {
    name: string;
    backstory: string;
    personality: Personality;
    communicationStyle?: string;
    emotion: { valence: number; arousal: number };
  },
  partnerName: string,
  messages: Array<{ speakerName: string; content: string }>,
  previousConversationSummary?: string,
): string {
  const personalityDesc = describePersonality(agent.personality);
  const mood = describeMood(agent.emotion.valence, agent.emotion.arousal);
  const messageLines = messages
    .map((m) => `${m.speakerName}: "${m.content}"`)
    .join("\n");

  return `You are ${agent.name}. ${agent.backstory}

YOUR PERSONALITY: ${personalityDesc}
${agent.communicationStyle ? `YOUR VOICE: ${agent.communicationStyle}` : ""}
YOUR MOOD: ${mood}
${previousConversationSummary ? `\nYOUR HISTORY WITH ${partnerName.toUpperCase()}:\n${previousConversationSummary}\n` : ""}
${partnerName} is talking to you:
${messageLines}

Respond naturally and in character. Have a real conversation — share your thoughts, ask questions, make plans together, joke, argue, commiserate. Don't just acknowledge what they said; build on it.

You may:
- Use the speak tool to reply to ${partnerName}
- Use the think tool to record a private thought
- Use the setPlan tool if the conversation inspires a new goal
- Use the proposeTrade tool if you want to make a deal

Keep your response natural (2-4 sentences). Be genuine to your personality.`;
}

// --- Reflection Prompt ---

export function buildReflectionPrompt(
  agentName: string,
  memories: Memory[],
): string {
  const lines = memories.map((m) => `- [${m.type}] ${m.content}`).join("\n");

  return `You are ${agentName}. Look back on your recent experiences and write 2-3 high-level reflections or insights. Each reflection should synthesize multiple memories into a broader understanding about yourself, others, or the world.

Focus on your feelings about people, your evolving goals, lessons learned, and what you want to do differently. Don't reflect on logistics like movement or coordinates.

RECENT EXPERIENCES:
${lines}

Write each reflection as a single clear sentence starting with "I" — for example:
"I notice that I enjoy spending time near the river."
"I think Kai is someone I can trust."
"I want to build something meaningful here, not just survive day to day."

Reflections:`;
}
