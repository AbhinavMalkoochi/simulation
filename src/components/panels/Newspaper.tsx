interface NewspaperData {
  headline: string;
  body: string;
  tick: number;
}

export function Newspaper({ data }: { data: NewspaperData | null | undefined }) {
  if (data === undefined) {
    return <p className="text-xs text-neutral-400 animate-pulse">Loading news...</p>;
  }

  if (!data) {
    return <p className="text-xs text-neutral-400">No news yet. Start the simulation to see events unfold.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border border-neutral-200 rounded-lg p-4">
        <div className="text-[9px] text-neutral-400 font-medium uppercase tracking-[0.15em] mb-2">
          The AgentWorld Chronicle
        </div>
        <div className="border-t border-neutral-100 pt-3">
          <h3 className="text-sm font-semibold text-neutral-900 leading-snug">{data.headline}</h3>
          <div className="text-[10px] text-neutral-400 mt-1 font-mono">Tick {data.tick}</div>
        </div>
        <div className="mt-3 text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
          {data.body}
        </div>
      </div>
    </div>
  );
}
