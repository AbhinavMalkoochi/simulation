import { mutation } from "./_generated/server";
import { MAP_WIDTH, MAP_HEIGHT, MAP_SEED, TILE_SIZE, RESOURCES } from "./lib/constants";
import { generateMap, isWalkable } from "./lib/mapgen";
import { seededRandom } from "./lib/utils";

const SEED_AGENTS = [
  {
    name: "Luna",
    backstory:
      "A restless wanderer driven by insatiable curiosity. Luna left her settlement to catalog every species of plant in the wild. She dreams of creating a botanical garden and writing the definitive guide to the region's flora. She believes beauty is as important as survival.",
    personality: { openness: 0.95, conscientiousness: 0.4, extraversion: 0.6, agreeableness: 0.7, neuroticism: 0.3 },
    skills: { gathering: 3, crafting: 1, building: 1, trading: 2, leadership: 1 },
    communicationStyle: "Speaks with wonder and uses nature metaphors. Often references plants, seasons, and the beauty of the wilderness.",
  },
  {
    name: "Kai",
    backstory:
      "A meticulous builder who finds peace in structure. Kai dreams of constructing a great hall where everyone can gather safely. He lost his old village to a flood and is determined to build something that lasts. He measures his worth by what he creates.",
    personality: { openness: 0.5, conscientiousness: 0.95, extraversion: 0.4, agreeableness: 0.6, neuroticism: 0.2 },
    skills: { gathering: 2, crafting: 3, building: 4, trading: 1, leadership: 2 },
    communicationStyle: "Direct and methodical. Uses precise language, talks about plans and measurements. Rarely wastes words.",
  },
  {
    name: "Ember",
    backstory:
      "The life of every gathering, Ember thrives on connection. She believes the strongest buildings are relationships, not walls. Her dream is to organize the first community feast and bring everyone together. She's never met a stranger — only a friend she hasn't made yet.",
    personality: { openness: 0.7, conscientiousness: 0.3, extraversion: 0.95, agreeableness: 0.8, neuroticism: 0.4 },
    skills: { gathering: 1, crafting: 1, building: 1, trading: 3, leadership: 3 },
    communicationStyle: "Warm and enthusiastic. Uses exclamations, asks personal questions, remembers details about others' lives.",
  },
  {
    name: "Sage",
    backstory:
      "A quiet healer who listens more than speaks. Sage collects herbs and tends to the wounded, asking nothing in return. She dreams of building a medicine hut where anyone can come for healing. She carries guilt from failing to save someone she loved.",
    personality: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.2, agreeableness: 0.95, neuroticism: 0.5 },
    skills: { gathering: 4, crafting: 2, building: 1, trading: 1, leadership: 1 },
    communicationStyle: "Soft-spoken and thoughtful. Asks deep questions, offers gentle advice. Speaks slowly and deliberately.",
  },
  {
    name: "Rex",
    backstory:
      "Ambitious and strategic, Rex sees himself as a natural leader. He wants to unite the scattered settlers into a proper civilization with laws, trade routes, and shared purpose. He fears being ordinary and pushes himself relentlessly.",
    personality: { openness: 0.6, conscientiousness: 0.8, extraversion: 0.8, agreeableness: 0.3, neuroticism: 0.7 },
    skills: { gathering: 1, crafting: 1, building: 2, trading: 3, leadership: 4 },
    communicationStyle: "Assertive and commanding. Frames everything as strategy. Uses 'we should' and 'the plan is'. Thinks big-picture.",
  },
  {
    name: "Ivy",
    backstory:
      "A nature-loving gatherer who feels most alive among trees. Ivy has an uncanny sense for finding hidden resources. She dreams of establishing a sustainable farm that feeds the whole community, proving that working with nature is better than against it.",
    personality: { openness: 0.8, conscientiousness: 0.6, extraversion: 0.3, agreeableness: 0.7, neuroticism: 0.2 },
    skills: { gathering: 4, crafting: 2, building: 1, trading: 2, leadership: 1 },
    communicationStyle: "Quiet and observant. Speaks in short, poetic phrases. Notices small details others miss.",
  },
  {
    name: "Flint",
    backstory:
      "A stoic craftsman of few words. Flint judges people by the quality of their work, not their speeches. His dream is to forge metal tools so fine they become legendary. He has a secret soft spot for anyone who shows genuine effort.",
    personality: { openness: 0.3, conscientiousness: 0.9, extraversion: 0.2, agreeableness: 0.4, neuroticism: 0.3 },
    skills: { gathering: 2, crafting: 4, building: 3, trading: 1, leadership: 1 },
    communicationStyle: "Blunt and terse. Values actions over words. Gives one-sentence answers. Grunts approval or disapproval.",
  },
  {
    name: "Nova",
    backstory:
      "An energetic trader who sees every interaction as a deal waiting to happen. Nova dreams of building the first market and becoming the hub of all commerce. She collects favors like others collect wood, and believes prosperity lifts everyone.",
    personality: { openness: 0.7, conscientiousness: 0.5, extraversion: 0.9, agreeableness: 0.5, neuroticism: 0.4 },
    skills: { gathering: 1, crafting: 1, building: 1, trading: 4, leadership: 2 },
    communicationStyle: "Fast-talking and persuasive. Frames everything as opportunities and deals. Uses sales-like language.",
  },
  {
    name: "Ash",
    backstory:
      "A quiet observer who watches patterns others miss. Ash keeps a mental journal of everything that happens. He dreams of understanding the deeper patterns of this world — weather, seasons, people's motivations. He often feels like an outsider looking in.",
    personality: { openness: 0.9, conscientiousness: 0.7, extraversion: 0.1, agreeableness: 0.6, neuroticism: 0.6 },
    skills: { gathering: 2, crafting: 2, building: 2, trading: 2, leadership: 2 },
    communicationStyle: "Analytical and measured. References patterns and past observations. Speaks in careful, considered sentences.",
  },
  {
    name: "Coral",
    backstory:
      "A community organizer who believes in collective strength. Coral mediates disputes and always seeks common ground. She dreams of establishing the first town council where everyone has a voice. She sometimes sacrifices her own needs for the group.",
    personality: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.7, agreeableness: 0.9, neuroticism: 0.3 },
    skills: { gathering: 1, crafting: 1, building: 2, trading: 2, leadership: 4 },
    communicationStyle: "Diplomatic and inclusive. Always seeks consensus, uses 'we' instead of 'I'. Acknowledges everyone's perspective.",
  },
];

export const seedWorld = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("worldState").first();
    if (existing) return existing._id;

    const worldId = await ctx.db.insert("worldState", {
      tick: 0,
      timeOfDay: 8,
      weather: "clear",
      season: "spring",
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      mapSeed: MAP_SEED,
      tileSize: TILE_SIZE,
      paused: true,
    });

    const mapTiles = generateMap(MAP_SEED, MAP_WIDTH, MAP_HEIGHT);
    const rand = seededRandom(MAP_SEED + 999);

    for (let i = 0; i < SEED_AGENTS.length; i++) {
      const agent = SEED_AGENTS[i];
      let x: number, y: number;
      do {
        x = Math.floor(rand() * MAP_WIDTH);
        y = Math.floor(rand() * MAP_HEIGHT);
      } while (!isWalkable(x, y, mapTiles, MAP_WIDTH, MAP_HEIGHT));

      await ctx.db.insert("agents", {
        ...agent,
        position: { x, y },
        energy: 100,
        emotion: { valence: 0.5, arousal: 0.3 },
        status: "idle",
        spriteSeed: i,
      });
    }

    const TILE_RESOURCE: Record<number, string> = { 3: "wood", 4: "stone" };
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = mapTiles[y * MAP_WIDTH + x];
        const resourceType = TILE_RESOURCE[tile] as keyof typeof RESOURCES.SPAWN_CHANCE | undefined;
        if (resourceType && rand() < RESOURCES.SPAWN_CHANCE[resourceType]) {
          await ctx.db.insert("resources", {
            tileX: x,
            tileY: y,
            type: resourceType as "wood" | "stone" | "food" | "metal" | "herbs",
            quantity: 2 + Math.floor(rand() * 4),
            maxQuantity: 6,
            regenRate: 0.15,
          });
        }

        if (tile === 2 && rand() < RESOURCES.SPAWN_CHANCE.food) {
          const rType = rand() < 0.5 ? "food" : "herbs";
          await ctx.db.insert("resources", {
            tileX: x,
            tileY: y,
            type: rType as "food" | "herbs",
            quantity: 1 + Math.floor(rand() * 3),
            maxQuantity: 5,
            regenRate: 0.2,
          });
        }

        if (tile === 4 && rand() < RESOURCES.SPAWN_CHANCE.metal) {
          await ctx.db.insert("resources", {
            tileX: x,
            tileY: y,
            type: "metal",
            quantity: 1 + Math.floor(rand() * 2),
            maxQuantity: 3,
            regenRate: 0.03,
          });
        }
      }
    }

    await ctx.db.insert("worldEvents", {
      type: "world_created",
      description: "The world awakens. Ten souls find themselves in an untamed land, each carrying dreams of what this place might become.",
      involvedAgentIds: [],
      tick: 0,
    });

    return worldId;
  },
});
