import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function StoryNarrator() {
  const narrative = useQuery(api.analytics.narrator.getNarrative);

  if (!narrative || narrative.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 text-sm italic">
        The story has yet to begin...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-3 font-serif">
      {narrative.map((section) => (
        <div key={section.period}>
          <h4 className="text-xs font-bold text-amber-400/80 tracking-wide uppercase mb-1.5">
            {section.label}
          </h4>
          <div className="flex flex-col gap-1">
            {section.entries.map((entry, i) => (
              <p
                key={`${section.period}-${i}`}
                className="text-xs text-slate-300/90 leading-relaxed"
              >
                <span className="text-slate-600 font-mono text-[9px] mr-1">[{entry.tick}]</span>
                {entry.text}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
