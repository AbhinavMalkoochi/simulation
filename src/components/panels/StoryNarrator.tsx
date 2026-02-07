import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function StoryNarrator() {
  const narrative = useQuery(api.analytics.narrator.getNarrative);

  if (!narrative || narrative.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-neutral-400 text-sm">
        The story has yet to begin...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {narrative.map((section) => (
        <div key={section.period}>
          <h4 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">
            {section.label}
          </h4>
          <div className="flex flex-col gap-1.5">
            {section.entries.map((entry, i) => (
              <p
                key={`${section.period}-${i}`}
                className="text-xs text-neutral-600 leading-relaxed"
              >
                <span className="text-neutral-300 font-mono text-[9px] mr-1">{entry.tick}</span>
                {entry.text}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
