import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const personality = v.object({
  openness: v.number(),
  conscientiousness: v.number(),
  extraversion: v.number(),
  agreeableness: v.number(),
  neuroticism: v.number(),
});

const position = v.object({
  x: v.number(),
  y: v.number(),
});

export default defineSchema({
  worldState: defineTable({
    tick: v.number(),
    timeOfDay: v.number(),
    weather: v.union(
      v.literal("clear"),
      v.literal("rain"),
      v.literal("storm"),
      v.literal("fog"),
    ),
    season: v.union(
      v.literal("spring"),
      v.literal("summer"),
      v.literal("autumn"),
      v.literal("winter"),
    ),
    mapWidth: v.number(),
    mapHeight: v.number(),
    mapSeed: v.number(),
    tileSize: v.number(),
    paused: v.boolean(),
  }),

  agents: defineTable({
    name: v.string(),
    backstory: v.string(),
    personality,
    position,
    targetPosition: v.optional(position),
    path: v.optional(v.array(position)),
    energy: v.number(),
    emotion: v.object({
      valence: v.number(),
      arousal: v.number(),
    }),
    currentPlan: v.optional(v.string()),
    currentAction: v.optional(v.string()),
    status: v.union(
      v.literal("idle"),
      v.literal("moving"),
      v.literal("talking"),
      v.literal("working"),
      v.literal("sleeping"),
      v.literal("exploring"),
    ),
    skills: v.object({
      gathering: v.number(),
      crafting: v.number(),
      building: v.number(),
      trading: v.number(),
      leadership: v.number(),
    }),
    spriteSeed: v.number(),
  }).index("by_status", ["status"]),

  memories: defineTable({
    agentId: v.id("agents"),
    type: v.union(
      v.literal("observation"),
      v.literal("reflection"),
      v.literal("plan"),
      v.literal("conversation"),
    ),
    content: v.string(),
    importance: v.number(),
    tick: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_type", ["agentId", "type"]),

  relationships: defineTable({
    agentId: v.id("agents"),
    targetAgentId: v.id("agents"),
    trust: v.number(),
    affinity: v.number(),
    interactionCount: v.number(),
    lastInteractionTick: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_pair", ["agentId", "targetAgentId"]),

  resources: defineTable({
    tileX: v.number(),
    tileY: v.number(),
    type: v.union(
      v.literal("wood"),
      v.literal("stone"),
      v.literal("food"),
      v.literal("metal"),
      v.literal("herbs"),
    ),
    quantity: v.number(),
    maxQuantity: v.number(),
    regenRate: v.number(),
  })
    .index("by_position", ["tileX", "tileY"])
    .index("by_type", ["type"]),

  inventory: defineTable({
    agentId: v.id("agents"),
    itemType: v.string(),
    quantity: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_item", ["agentId", "itemType"]),

  buildings: defineTable({
    type: v.union(
      v.literal("shelter"),
      v.literal("workshop"),
      v.literal("market"),
      v.literal("meetingHall"),
      v.literal("farm"),
      v.literal("storehouse"),
    ),
    posX: v.number(),
    posY: v.number(),
    ownerId: v.optional(v.id("agents")),
    allianceId: v.optional(v.id("alliances")),
    condition: v.number(),
    level: v.number(),
  })
    .index("by_position", ["posX", "posY"])
    .index("by_owner", ["ownerId"]),

  alliances: defineTable({
    name: v.string(),
    founderId: v.id("agents"),
    memberIds: v.array(v.id("agents")),
    rules: v.array(v.string()),
    description: v.optional(v.string()),
  }).index("by_founder", ["founderId"]),

  proposals: defineTable({
    allianceId: v.id("alliances"),
    proposerId: v.id("agents"),
    content: v.string(),
    votes: v.array(
      v.object({
        agentId: v.id("agents"),
        vote: v.boolean(),
      }),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("passed"),
      v.literal("rejected"),
    ),
    tick: v.number(),
  })
    .index("by_alliance", ["allianceId"])
    .index("by_status", ["status"]),

  trades: defineTable({
    initiatorId: v.id("agents"),
    responderId: v.id("agents"),
    offer: v.array(v.object({ itemType: v.string(), quantity: v.number() })),
    request: v.array(v.object({ itemType: v.string(), quantity: v.number() })),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("expired"),
    ),
    tick: v.number(),
  })
    .index("by_initiator", ["initiatorId"])
    .index("by_responder", ["responderId"]),

  conversations: defineTable({
    participantIds: v.array(v.id("agents")),
    messages: v.array(
      v.object({
        speakerId: v.id("agents"),
        content: v.string(),
        tick: v.number(),
      }),
    ),
    startTick: v.number(),
    endTick: v.optional(v.number()),
  }).index("by_start", ["startTick"]),

  worldEvents: defineTable({
    type: v.string(),
    description: v.string(),
    involvedAgentIds: v.array(v.id("agents")),
    tick: v.number(),
  })
    .index("by_tick", ["tick"])
    .index("by_type", ["type"]),
});
