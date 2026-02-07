import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface NewspaperData {
  headline: string;
  body: string;
  tick: number;
}

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

export function Newspaper({ data }: { data: NewspaperData | null | undefined }) {
  const dailySummaries = useQuery(api.analytics.dailySummary.getDailySummaries) as DailySummary[] | undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Latest Breaking News */}
      <div className="border border-neutral-200 rounded-lg p-4">
        <div className="text-[9px] text-neutral-400 font-medium uppercase tracking-[0.15em] mb-2">
          The AgentWorld Chronicle — Breaking
        </div>
        <div className="border-t border-neutral-100 pt-3">
          {data === undefined ? (
            <p className="text-xs text-neutral-400 animate-pulse">Loading news...</p>
          ) : !data ? (
            <p className="text-xs text-neutral-400">No news yet. Start the simulation to see events unfold.</p>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-neutral-900 leading-snug">{data.headline}</h3>
              <div className="text-[10px] text-neutral-400 mt-1 font-mono">Tick {data.tick}</div>
              <div className="mt-3 text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                {data.body}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Daily Summaries */}
      {dailySummaries && dailySummaries.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            Daily Digests
          </h3>
          {dailySummaries.map((summary) => {
            const { headline, body } = parseSummary(summary.content);
            return (
              <div key={summary._id} className="border border-neutral-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-neutral-500">
                    Day {summary.day}
                  </span>
                  <span className="text-[9px] text-neutral-400">
                    {summary.eventCount} events
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 leading-snug mb-2">
                  {headline}
                </h4>
                <div className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                  {body}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
