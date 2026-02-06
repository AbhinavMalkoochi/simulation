interface NewspaperData {
  headline: string;
  body: string;
  tick: number;
}

export function Newspaper({ data }: { data: NewspaperData | null | undefined }) {
  if (data === undefined) {
    return <p className="text-xs text-slate-600 italic animate-pulse">Loading news...</p>;
  }

  if (!data) {
    return <p className="text-xs text-slate-600 italic">No news yet. Start the simulation to see events unfold.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="border border-slate-700 rounded-lg p-3 bg-slate-900/30">
        <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1">
          The AgentWorld Chronicle
        </div>
        <div className="border-t border-slate-700 pt-2">
          <h3 className="text-sm font-bold text-slate-100 leading-snug">{data.headline}</h3>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Tick {data.tick}</div>
        </div>
        <div className="mt-2 text-xs text-slate-400 leading-relaxed whitespace-pre-line">
          {data.body}
        </div>
      </div>
    </div>
  );
}
