import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateText, stepCountIs } from "ai";
import { xai } from "@ai-sdk/xai";

const TICKS_PER_DAY = 192;

export const generateWorldDaySummary = internalAction({
  args: { day: v.number(), tick: v.number() },
  handler: async (ctx, { day, tick }) => {
    // Fetch all events from this day
    const dayStartTick = (day - 1) * TICKS_PER_DAY;
    const dayEndTick = day * TICKS_PER_DAY;

    // Get events via worldState query and filter by tick range
    const allEvents = await ctx.runQuery(
      internal.analytics.dailySummary.getDayEvents,
      {
        startTick: dayStartTick,
        endTick: dayEndTick,
      },
    );

    if (allEvents.length < 3) return;

    // Categorize events for the summary
    const conversations = allEvents.filter((e) => e.type === "conversation");
    const gathers = allEvents.filter((e) => e.type === "gather");
    const crafts = allEvents.filter((e) => e.type === "craft");
    const builds = allEvents.filter((e) => e.type === "build");
    const trades = allEvents.filter((e) => e.type === "trade");
    const gifts = allEvents.filter((e) => e.type === "gift");
    const allianceEvents = allEvents.filter((e) => e.type === "alliance");
    const governance = allEvents.filter((e) => e.type === "governance");
    const conflicts = allEvents.filter((e) => e.type === "conflict");
    const territory = allEvents.filter((e) => e.type === "territory");

    // Build a condensed event summary for the LLM
    const eventSummary = [
      conversations.length > 0
        ? `${conversations.length} conversations took place. Notable: ${conversations
            .slice(0, 5)
            .map((e) => e.description)
            .join("; ")}`
        : null,
      gathers.length > 0
        ? `${gathers.length} resource gathering events: ${gathers
            .slice(0, 3)
            .map((e) => e.description)
            .join("; ")}`
        : null,
      crafts.length > 0
        ? `${crafts.length} items crafted: ${crafts
            .slice(0, 3)
            .map((e) => e.description)
            .join("; ")}`
        : null,
      builds.length > 0
        ? `${builds.length} structures built: ${builds.map((e) => e.description).join("; ")}`
        : null,
      trades.length > 0
        ? `${trades.length} trade events: ${trades
            .slice(0, 3)
            .map((e) => e.description)
            .join("; ")}`
        : null,
      gifts.length > 0
        ? `${gifts.length} gifts exchanged: ${gifts
            .slice(0, 3)
            .map((e) => e.description)
            .join("; ")}`
        : null,
      allianceEvents.length > 0
        ? `Alliance activity: ${allianceEvents.map((e) => e.description).join("; ")}`
        : null,
      governance.length > 0
        ? `Governance: ${governance.map((e) => e.description).join("; ")}`
        : null,
      conflicts.length > 0
        ? `Conflicts: ${conflicts.map((e) => e.description).join("; ")}`
        : null,
      territory.length > 0
        ? `Territory claims: ${territory.map((e) => e.description).join("; ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `You are a narrator for a wilderness survival simulation where 10 AI agents live together. Write a compelling, human-readable daily summary for Day ${day}.

EVENTS THAT HAPPENED TODAY:
${eventSummary}

Total events: ${allEvents.length} (${conversations.length} conversations, ${gathers.length} gathers, ${crafts.length} crafts, ${builds.length} builds, ${trades.length} trades, ${gifts.length} gifts, ${allianceEvents.length} alliance events, ${conflicts.length} conflicts)

Write a summary that covers:
1. HEADLINE: A catchy 5-8 word headline summarizing the day's biggest story
2. OVERVIEW: 2-3 sentences capturing the day's mood and major developments
3. POLITICS & ALLIANCES: Any alliance formations, governance votes, or power dynamics (if applicable)
4. ECONOMY: Resource gathering, trading, and building activity
5. RELATIONSHIPS: Notable interactions, gifts, conflicts, or shifting dynamics
6. OUTLOOK: What tomorrow might bring based on today's trends

Write in third person as an omniscient narrator. Be specific about agent names and events. Keep it concise but engaging — like a newspaper article, not a log file. Use natural language, not quotes from the agents. Total length: 150-250 words.

Format:
HEADLINE: [headline]
---
[body text with paragraph breaks]`;

    try {
      const result = await generateText({
        model: xai("grok-3-mini"),
        prompt,
        stopWhen: stepCountIs(1),
      });

      if (result.text) {
        await ctx.runAction(internal.analytics.dailySummary.storeDaySummary, {
          day,
          content: result.text.slice(0, 2000),
          tick,
          eventCount: allEvents.length,
        });
      }
    } catch (error) {
      console.error(
        `World day summary generation failed for day ${day}:`,
        error,
      );
    }
  },
});

/** Internal query to get events within a tick range */
export const getDayEvents = internalQuery({
  args: { startTick: v.number(), endTick: v.number() },
  handler: async (ctx, { startTick, endTick }) => {
    const events = await ctx.db
      .query("worldEvents")
      .withIndex("by_tick", (q) => q.gte("tick", startTick).lt("tick", endTick))
      .collect();

    return events.filter((e) => e.type !== "tick_summary");
  },
});

/** Store a day summary as a world event */
export const storeDaySummary = internalAction({
  args: {
    day: v.number(),
    content: v.string(),
    tick: v.number(),
    eventCount: v.number(),
  },
  handler: async (ctx, { day, content, tick, eventCount }) => {
    await ctx.runMutation(
      internal.analytics.dailySummary.insertDaySummaryEvent,
      {
        day,
        content,
        tick,
        eventCount,
      },
    );
  },
});

export const insertDaySummaryEvent = internalMutation({
  args: {
    day: v.number(),
    content: v.string(),
    tick: v.number(),
    eventCount: v.number(),
  },
  handler: async (ctx, { day, content, tick, eventCount }) => {
    await ctx.db.insert("worldEvents", {
      type: "daily_summary",
      description: `[Day ${day} Summary | ${eventCount} events]\n${content}`,
      involvedAgentIds: [],
      tick,
    });
  },
});

/** Public query to retrieve daily world summaries */
export const getDailySummaries = query({
  handler: async (ctx) => {
    const events = await ctx.db
      .query("worldEvents")
      .withIndex("by_type", (q) => q.eq("type", "daily_summary"))
      .order("desc")
      .take(10);

    return events.map((e) => {
      const match = e.description.match(
        /^\[Day (\d+) Summary \| (\d+) events\]\n([\s\S]+)$/,
      );
      if (match) {
        return {
          _id: e._id,
          day: parseInt(match[1]),
          eventCount: parseInt(match[2]),
          content: match[3],
          tick: e.tick,
        };
      }
      return {
        _id: e._id,
        day: 0,
        eventCount: 0,
        content: e.description,
        tick: e.tick,
      };
    });
  },
});
