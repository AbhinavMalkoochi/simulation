import { action, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const getLatestSummary = query({
  handler: async (ctx) => {
    const events = await ctx.db
      .query("worldEvents")
      .withIndex("by_tick")
      .order("desc")
      .take(30);

    if (events.length === 0) return null;

    const interestingEvents = events.filter(
      (e) => e.type !== "tick_summary",
    );

    if (interestingEvents.length === 0) {
      return { headline: "A Quiet Day", body: "Nothing notable happened recently.", tick: 0 };
    }

    const latest = interestingEvents[0];
    const eventLines = interestingEvents
      .slice(0, 10)
      .map((e) => `- ${e.description}`)
      .join("\n");

    return {
      headline: deriveHeadline(interestingEvents),
      body: eventLines,
      tick: latest.tick,
    };
  },
});

function deriveHeadline(
  events: Array<{ type: string; description: string }>,
): string {
  const types = events.map((e) => e.type);
  if (types.includes("alliance")) return "New Alliance Shakes Up the Land";
  if (types.includes("governance")) return "Democracy in Action: Rules Debated";
  if (types.includes("trade")) return "Commerce Flourishes Between Settlers";
  if (types.includes("build")) return "Construction Boom: New Buildings Rise";
  if (types.includes("conversation")) return "Voices Carry: Settlers Connect";
  if (types.includes("gift")) return "Acts of Generosity Warm Hearts";
  return "Life Goes On in the Wilderness";
}
