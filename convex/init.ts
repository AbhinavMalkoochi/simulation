import { mutation } from "./_generated/server";
import { MAP_WIDTH, MAP_HEIGHT, MAP_SEED, TILE_SIZE } from "./lib/constants";
import { generateMap, isWalkable } from "./lib/mapgen";

const SEED_AGENTS = [
  {
    name: "Luna",
    backstory:
      "A restless wanderer driven by insatiable curiosity. Luna left her settlement to catalog every species of plant in the wild.",
    personality: { openness: 0.95, conscientiousness: 0.4, extraversion: 0.6, agreeableness: 0.7, neuroticism: 0.3 },
    skills: { gathering: 3, crafting: 1, building: 1, trading: 2, leadership: 1 },
  },
  {
    name: "Kai",
    backstory:
      "A meticulous builder who finds peace in structure. Kai dreams of constructing a great hall where everyone can gather.",
    personality: { openness: 0.5, conscientiousness: 0.95, extraversion: 0.4, agreeableness: 0.6, neuroticism: 0.2 },
    skills: { gathering: 2, crafting: 3, building: 4, trading: 1, leadership: 2 },
  },
  {
    name: "Ember",
    backstory:
      "The life of every gathering, Ember thrives on connection. She believes communities are built through conversation, not walls.",
    personality: { openness: 0.7, conscientiousness: 0.3, extraversion: 0.95, agreeableness: 0.8, neuroticism: 0.4 },
    skills: { gathering: 1, crafting: 1, building: 1, trading: 3, leadership: 3 },
  },
  {
    name: "Sage",
    backstory:
      "A quiet healer who listens more than speaks. Sage collects herbs and tends to the wounded, asking nothing in return.",
    personality: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.2, agreeableness: 0.95, neuroticism: 0.5 },
    skills: { gathering: 4, crafting: 2, building: 1, trading: 1, leadership: 1 },
  },
  {
    name: "Rex",
    backstory:
      "Ambitious and strategic, Rex sees himself as a natural leader. He wants to unite the scattered agents into a proper civilization.",
    personality: { openness: 0.6, conscientiousness: 0.8, extraversion: 0.8, agreeableness: 0.3, neuroticism: 0.7 },
    skills: { gathering: 1, crafting: 1, building: 2, trading: 3, leadership: 4 },
  },
  {
    name: "Ivy",
    backstory:
      "A nature-loving gatherer who feels most alive among trees. Ivy has an uncanny sense for finding hidden resources.",
    personality: { openness: 0.8, conscientiousness: 0.6, extraversion: 0.3, agreeableness: 0.7, neuroticism: 0.2 },
    skills: { gathering: 4, crafting: 2, building: 1, trading: 2, leadership: 1 },
  },
  {
    name: "Flint",
    backstory:
      "A stoic craftsman of few words. Flint judges people by the quality of their work, not their speeches.",
    personality: { openness: 0.3, conscientiousness: 0.9, extraversion: 0.2, agreeableness: 0.4, neuroticism: 0.3 },
    skills: { gathering: 2, crafting: 4, building: 3, trading: 1, leadership: 1 },
  },
  {
    name: "Nova",
    backstory:
      "An energetic trader who sees every interaction as a deal waiting to happen. Nova can sell sand to a desert dweller.",
    personality: { openness: 0.7, conscientiousness: 0.5, extraversion: 0.9, agreeableness: 0.5, neuroticism: 0.4 },
    skills: { gathering: 1, crafting: 1, building: 1, trading: 4, leadership: 2 },
  },
  {
    name: "Ash",
    backstory:
      "A quiet observer who watches patterns others miss. Ash keeps a mental journal of everything that happens around him.",
    personality: { openness: 0.9, conscientiousness: 0.7, extraversion: 0.1, agreeableness: 0.6, neuroticism: 0.6 },
    skills: { gathering: 2, crafting: 2, building: 2, trading: 2, leadership: 2 },
  },
  {
    name: "Coral",
    backstory:
      "A community organizer who believes in collective strength. Coral mediates disputes and always seeks common ground.",
    personality: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.7, agreeableness: 0.9, neuroticism: 0.3 },
    skills: { gathering: 1, crafting: 1, building: 2, trading: 2, leadership: 4 },
  },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

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
        const resourceType = TILE_RESOURCE[tile];
        if (resourceType && rand() < 0.15) {
          await ctx.db.insert("resources", {
            tileX: x,
            tileY: y,
            type: resourceType as "wood" | "stone" | "food" | "metal" | "herbs",
            quantity: 3 + Math.floor(rand() * 5),
            maxQuantity: 8,
            regenRate: 0.2,
          });
        }

        if (tile === 2 && rand() < 0.05) {
          const rType = rand() < 0.5 ? "food" : "herbs";
          await ctx.db.insert("resources", {
            tileX: x,
            tileY: y,
            type: rType as "food" | "herbs",
            quantity: 2 + Math.floor(rand() * 4),
            maxQuantity: 6,
            regenRate: 0.3,
          });
        }

        if (tile === 4 && rand() < 0.03) {
          await ctx.db.insert("resources", {
            tileX: x,
            tileY: y,
            type: "metal",
            quantity: 1 + Math.floor(rand() * 3),
            maxQuantity: 4,
            regenRate: 0.05,
          });
        }
      }
    }

    await ctx.db.insert("worldEvents", {
      type: "world_created",
      description: "The world awakens. Ten souls find themselves in an untamed land, rich with resources.",
      involvedAgentIds: [],
      tick: 0,
    });

    return worldId;
  },
});
