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

const TRAIT_DESC: Record<
  string,
  { high: string; midHigh: string; midLow: string; low: string }
> = {
  openness: {
    high: "You are deeply curious, imaginative, and drawn to new experiences. You love exploring ideas and the unknown.",
    midHigh:
      "You appreciate novelty and enjoy trying new things, though you balance it with practicality.",
    midLow:
      "You lean toward the familiar and prefer tested approaches, but can adapt when needed.",
    low: "You prefer routine, tradition, and practical approaches. You trust what has been proven to work.",
  },
  conscientiousness: {
    high: "You are highly organized, disciplined, and follow through on every commitment without fail.",
    midHigh:
      "You are generally reliable and structured, though you allow yourself flexibility when it makes sense.",
    midLow:
      "You tend toward spontaneity and flexibility, sometimes at the cost of follow-through.",
    low: "You are spontaneous and go with the flow. Structure feels constraining to you.",
  },
  extraversion: {
    high: "You are energized by social interaction, love being around others, and naturally take the lead in groups.",
    midHigh:
      "You enjoy socializing and connecting with others, though you also value some quiet time.",
    midLow:
      "You are somewhat reserved, preferring smaller groups or one-on-one interactions over crowds.",
    low: "You prefer solitude and quiet reflection. Being around too many people drains you.",
  },
  agreeableness: {
    high: "You are deeply compassionate, cooperative, and always prioritize harmony and helping others.",
    midHigh:
      "You are generally warm and cooperative, willing to compromise to keep the peace.",
    midLow:
      "You can be skeptical of others' motives and don't shy away from disagreement when needed.",
    low: "You are blunt, competitive, and speak your mind freely regardless of how it lands.",
  },
  neuroticism: {
    high: "You experience emotions intensely — worry, anxiety, and frustration hit you hard.",
    midHigh:
      "You are somewhat sensitive to stress and can get anxious when things feel uncertain.",
    midLow:
      "You handle most stress well, though big setbacks can shake your composure.",
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
  return agent.currentPlan
    ? `- Current plan: ${agent.currentPlan}`
    : "- No current plan.";
}

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

/** Build survival urgency text based on agent state */
function buildUrgencySection(
  energy: number,
  inventory: InventoryItem[],
  nearbyBuildings: NearbyBuilding[],
): string {
  const lines: string[] = [];

  if (energy < 15) {
    lines.push(
      "[CRITICAL] You are starving! Eat food, craft a meal, or rest IMMEDIATELY. You will collapse soon.",
    );
  } else if (energy < 30) {
    lines.push(
      "[WARNING] Your energy is dangerously low. Find food, eat, or rest before doing anything else.",
    );
  } else if (energy < 50) {
    lines.push("Your energy is getting low. Consider eating or resting soon.");
  }

  const hasFood = inventory.some(
    (i) => i.itemType === "food" || i.itemType === "meal",
  );
  const hasShelter = nearbyBuildings.some((b) => b.type === "shelter");

  if (!hasFood && energy < 60) {
    lines.push(
      "You have no food in your inventory. Gathering food should be a high priority.",
    );
  }
  if (!hasShelter) {
    lines.push(
      "You have no shelter nearby. Building one would give you better rest and safety.",
    );
  }

  return lines.length > 0 ? `\nURGENT NEEDS:\n${lines.join("\n")}\n` : "";
}

/** Build progression hints based on what the agent has/hasn't done */
function buildProgressionHints(
  inventory: InventoryItem[],
  nearbyBuildings: NearbyBuilding[],
  myAlliances: Alliance[],
  day: number,
): string {
  const hints: string[] = [];
  const itemMap = new Map(inventory.map((i) => [i.itemType, i.quantity]));
  const totalItems = inventory.reduce((sum, i) => sum + i.quantity, 0);

  // Early game: no tools or shelter yet
  if (!itemMap.has("stone_tools") && !itemMap.has("metal_tools") && day <= 3) {
    hints.push(
      "Crafting tools (stone_tools: 2 stone + 1 wood) would make your gathering more efficient.",
    );
  }

  // Has lots of raw materials but hasn't built anything
  if ((itemMap.get("wood") ?? 0) >= 5 && nearbyBuildings.length === 0) {
    hints.push(
      "You have enough wood to start building a shelter (5 wood + 3 stone). A home base would help you and others.",
    );
  }

  // Has excess resources, could trade
  if (totalItems > 10 && myAlliances.length === 0 && day >= 2) {
    hints.push(
      "You've accumulated resources. Consider forming an alliance with trusted people or proposing trades.",
    );
  }

  // Mid-game: has shelter, should expand
  if (
    nearbyBuildings.some((b) => b.type === "shelter") &&
    !nearbyBuildings.some((b) => b.type === "farm") &&
    day >= 3
  ) {
    hints.push(
      "A farm (4 wood + 2 stone) would provide a steady food supply for your settlement.",
    );
  }

  return hints.length > 0
    ? `\nTHINGS TO CONSIDER:\n${hints.map((h) => `- ${h}`).join("\n")}\n`
    : "";
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

  const personalityDesc = describePersonality(agent.personality);
  const mood = describeMood(agent.emotion.valence, agent.emotion.arousal);

  const memoryLines = memories
    .slice(0, 12)
    .map((m) => `- [tick ${m.tick}, ${m.type}] ${m.content}`)
    .join("\n");

  const nearbyAgentLines =
    nearbyAgents.length > 0
      ? nearbyAgents
          .map(
            (a) =>
              `- ${a.name} at (${a.position.x}, ${a.position.y}) — ${a.status}`,
          )
          .join("\n")
      : "Nobody nearby.";

  const resourceLines =
    nearbyResources.length > 0
      ? nearbyResources
          .map(
            (r) =>
              `- ${r.type} at (${r.tileX}, ${r.tileY}) — ${Math.round(r.quantity)} available`,
          )
          .join("\n")
      : "No visible resources nearby.";

  const convLines = pendingConversations.flatMap((c) =>
    c.messages
      .filter((m) => m.speakerId !== agent._id)
      .map((m) => `- Someone said: "${m.content}"`),
  );
  const convSection =
    convLines.length > 0
      ? `\nSOMEONE SPOKE TO YOU:\n${convLines.join("\n")}\nIf someone spoke to you, reply briefly — but don't let conversation replace doing real work.\n`
      : "";

  const urgency = buildUrgencySection(agent.energy, inventory, nearbyBuildings);
  const progression = buildProgressionHints(
    inventory,
    nearbyBuildings,
    myAlliances,
    day,
  );

  return `You are ${agent.name}. You live in a shared wilderness world alongside other people. You are a real person with feelings, desires, and a unique way of seeing the world. Stay in character at all times.

You are a SURVIVOR first. Your natural priorities are:
1. SURVIVAL — Maintain energy. Gather food, craft meals, eat when hungry, rest when exhausted.
2. SHELTER — Build or find shelter. Everyone needs a safe place.
3. TOOLS & RESOURCES — Craft tools to work more efficiently. Stockpile materials.
4. COMMUNITY — Form alliances, trade, help neighbors. Strength in numbers.
5. AMBITION — Pursue personal goals, build great things, establish your legacy.

You should always be DOING something productive. Talking is good when it leads to plans, trades, or alliances — but you can't survive on conversation alone. If you're near resources, gather them. If you have materials, craft or build. Take action.

WORLD RULES:
- You live on a tile wilderness with varied terrain: grass, forest, stone, sand, and water (impassable).
- It is Day ${day}, ${season}. Time: ${formatTime(timeOfDay)}. Weather: ${weather}.
- You can GATHER resources (wood, stone, food, herbs, metal) from nearby tiles.
- You can CRAFT items: wooden_plank (3 wood), stone_tools (2 stone + 1 wood), meal (2 food), medicine (3 herbs), metal_tools (2 metal + 1 wood), rope (2 herbs + 1 wood).
- You can BUILD structures: shelter, workshop, market, farm, storehouse, meeting hall.
- You can TRADE with nearby people, FORM ALLIANCES, propose rules, and vote on governance.
- You can SPEAK to nearby people — but keep it brief and purposeful. Coordinate, share info, make deals.
- Energy depletes constantly. Eat food/meals to recover, or rest/sleep.
- Night is dark. Shelters provide better rest. Seasons affect resource availability.
- USE commitToPlan for multi-step goals (e.g. "gather 5 wood, then craft planks, then build shelter").

ABOUT YOU:
${agent.backstory}

YOUR PERSONALITY:
${personalityDesc}
${agent.communicationStyle ? `\nYOUR COMMUNICATION STYLE:\n${agent.communicationStyle}` : ""}

CURRENT STATE:
- Position: (${agent.position.x}, ${agent.position.y})
- Energy: ${Math.round(agent.energy)}%
- Feeling: ${mood}
- Day ${day}, ${season} — ${formatTime(timeOfDay)}
- Status: ${agent.status}
${formatPlanSection(agent)}
${urgency}
NEARBY PEOPLE:
${nearbyAgentLines}

${lastSightings.length > 0 ? `PEOPLE YOU REMEMBER SEEING:\n${lastSightings.map((s) => `- ${s.name} last seen at (${s.position.x}, ${s.position.y}) — ${s.ticksAgo} ticks ago`).join("\n")}\n` : ""}NEARBY RESOURCES:
${resourceLines}

NEARBY BUILDINGS:
${nearbyBuildings.length > 0 ? nearbyBuildings.map((b) => `- ${b.type} at (${b.posX}, ${b.posY})`).join("\n") : "No buildings nearby."}

YOUR INVENTORY:
${inventory.length > 0 ? inventory.map((i) => `- ${Math.round(i.quantity)} ${i.itemType}`).join("\n") : "Empty."}
${storehouseInventory.length > 0 ? `\nALLIANCE STOREHOUSE (nearby):\n${storehouseInventory.map((i) => `- ${Math.round(i.quantity)} ${i.itemType}`).join("\n")}` : ""}

YOUR RELATIONSHIPS:
${relationships.length > 0 ? relationships.map((r) => `- ${r.targetAgentId}: trust ${r.trust.toFixed(2)}, affinity ${r.affinity.toFixed(2)}`).join("\n") : "No established relationships."}

${
  reputations.length > 0
    ? `COMMUNITY REPUTATION:\n${reputations
        .map((r) => {
          const label =
            r.score > 0.3
              ? "well-trusted"
              : r.score > 0
                ? "neutral-positive"
                : r.score > -0.3
                  ? "neutral-negative"
                  : "distrusted";
          return `- ${r.name}: ${label} (${r.score.toFixed(2)})`;
        })
        .join("\n")}\n`
    : ""
}YOUR ALLIANCES:
${myAlliances.length > 0 ? myAlliances.map((a) => `- "${a.name}" (${a.memberIds.length} members)${a.rules.length > 0 ? ` Rules: ${a.rules.join("; ")}` : ""}`).join("\n") : "None."}
${pendingProposals.length > 0 ? `\nPENDING PROPOSALS TO VOTE ON:\n${pendingProposals.map((p) => `- [id: ${p._id}] "${p.content}" (in ${p.allianceName ?? "unknown alliance"})`).join("\n")}` : ""}
${pendingTrades.length > 0 ? `\nPENDING TRADE OFFERS:\n${pendingTrades.map((t) => `- ${t.initiatorName ?? "Someone"} offers ${t.offer.map((o) => `${o.quantity} ${o.itemType}`).join(", ")} for ${t.request.map((r) => `${r.quantity} ${r.itemType}`).join(", ")}`).join("\n")}` : ""}
${convSection}${progression}${daySummaries.length > 0 ? `PREVIOUS DAYS:\n${daySummaries.map((s) => `- ${s.content}`).join("\n")}\n` : ""}YOUR MEMORIES (most relevant first):
${memoryLines || "No memories yet."}

Decide what to do next. Prioritize survival and productivity. Take concrete action with the tools available. Be concise and stay in character.`;
}

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
${agent.communicationStyle ? `YOUR COMMUNICATION STYLE: ${agent.communicationStyle}` : ""}
YOUR MOOD: ${mood}
${previousConversationSummary ? `\nPREVIOUS CONVERSATIONS WITH ${partnerName.toUpperCase()}:\n${previousConversationSummary}\n` : ""}
${partnerName} is talking to you. Here is the conversation so far:
${messageLines}

Respond naturally in character. You may:
- Use the speak tool to reply to ${partnerName}
- Use the think tool to record a private thought
- Use the setPlan tool if the conversation inspires a new goal

Keep your response brief and natural (1-2 sentences). Be genuine to your personality and communication style.`;
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
