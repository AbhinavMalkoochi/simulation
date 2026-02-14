import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface DailySummary {
  _id: string;
  day: number;
  eventCount: number;
  content: string;
  tick: number;
}

function parseSummary(content: string): { headline: string; body: string } {
  const headlineMatch = content.match(/^HEADLINE:\s*(.+?)(?:\n|---)/);
  const headline = headlineMatch?.[1]?.trim() ?? "Daily Summary";
  const body = content
    .replace(/^HEADLINE:\s*.+?\n/, "")
    .replace(/^---+\n?/, "")
    .trim();
  return { headline, body };
}

function DaySummaryCard({ summary }: { summary: DailySummary }) {
  const { headline, body } = parseSummary(summary.content);
  return (
    <article className="border border-neutral-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
          Day {summary.day}
        </span>
        <span className="text-[9px] text-neutral-400 tabular-nums">
          {summary.eventCount} events
        </span>
      </div>
      <h4 className="text-sm font-semibold text-neutral-900 leading-snug mb-2">
        {headline}
      </h4>
      <div className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
        {body}
      </div>
    </article>
  );
}

export function Newspaper() {
  const dailySummaries = useQuery(api.analytics.dailySummary.getDailySummaries) as DailySummary[] | undefined;

  if (!dailySummaries || dailySummaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <p className="text-xs text-neutral-400">No chronicles yet.</p>
        <p className="text-[10px] text-neutral-300">Daily summaries appear at the end of each day.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[9px] text-neutral-400 font-medium uppercase tracking-[0.15em]">
        The AgentWorld Chronicle
      </div>
      <div className="flex flex-col gap-3">
        {dailySummaries.map((summary) => (
          <DaySummaryCard key={summary._id} summary={summary} />
        ))}
      </div>
    </div>
  );
}
