import { query } from "../_generated/server";

const TIME_PERIOD_LABELS: Record<string, string> = {
  dawn: "As dawn breaks",
  morning: "In the morning light",
  midday: "Under the midday sun",
  afternoon: "Through the afternoon",
  evening: "As evening falls",
  night: "Under the cover of night",
};

function getTimePeriod(timeOfDay: number): string {
  if (timeOfDay >= 5 && timeOfDay < 7) return "dawn";
  if (timeOfDay >= 7 && timeOfDay < 12) return "morning";
  if (timeOfDay >= 12 && timeOfDay < 14) return "midday";
  if (timeOfDay >= 14 && timeOfDay < 18) return "afternoon";
  if (timeOfDay >= 18 && timeOfDay < 21) return "evening";
  return "night";
}

function narrateEvent(event: { type: string; description: string; tick: number }): string | null {
  const { type, description } = event;

  switch (type) {
    case "conversation": {
      const match = description.match(/^(.+?) said to (.+?): "(.+?)"$/);
      if (match) return `${match[1]} turned to ${match[2]} and said, "${match[3]}"`;
      return description;
    }
    case "gather": {
      const match = description.match(/^(.+?) gathered (\d+) (.+?)\.$/);
      if (match) return `${match[1]} foraged the land, collecting ${match[2]} ${match[3]}.`;
      return description;
    }
    case "craft": {
      const match = description.match(/^(.+?) crafted (\d+) (.+?)\.$/);
      if (match) return `With skilled hands, ${match[1]} crafted ${match[2]} ${match[3]}.`;
      return description;
    }
    case "build": {
      const match = description.match(/^(.+?) built a (.+?) at/);
      if (match) return `${match[1]} raised a ${match[2]}, adding to the settlement.`;
      return description;
    }
    case "trade": {
      if (description.includes("completed")) return description.replace("Trade completed between", "A trade was struck between");
      return null; // Skip trade proposals, only narrate completions
    }
    case "gift": {
      const match = description.match(/^(.+?) gave (\d+) (.+?) to (.+?)\.$/);
      if (match) return `In a gesture of goodwill, ${match[1]} offered ${match[2]} ${match[3]} to ${match[4]}.`;
      return description;
    }
    case "alliance": {
      if (description.includes("founded")) return description.replace("founded", "established");
      if (description.includes("joined")) return description;
      return description;
    }
    case "conflict": {
      return description;
    }
    case "territory": {
      return description;
    }
    case "governance": {
      if (description.includes("passed")) return description;
      return null; // Skip proposals, only narrate outcomes
    }
    case "god_action": {
      return description;
    }
    default:
      return null;
  }
}

export const getNarrative = query({
  handler: async (ctx) => {
    const world = await ctx.db.query("worldState").first();
    if (!world) return [];

    const events = await ctx.db
      .query("worldEvents")
      .withIndex("by_tick")
      .order("desc")
      .take(100);

    // Group by time period (approximate from tick)
    const grouped = new Map<string, Array<{ text: string; tick: number }>>();

    for (const event of events.reverse()) {
      // Convert tick to approximate timeOfDay
      const approximateTime = (event.tick * 0.5 + 8) % 24;
      const period = getTimePeriod(approximateTime);
      const narrated = narrateEvent(event);
      if (!narrated) continue;

      if (!grouped.has(period)) grouped.set(period, []);
      grouped.get(period)!.push({ text: narrated, tick: event.tick });
    }

    return Array.from(grouped.entries()).map(([period, entries]) => ({
      period,
      label: TIME_PERIOD_LABELS[period] ?? period,
      entries: entries.slice(-8), // Cap entries per period
    }));
  },
});
