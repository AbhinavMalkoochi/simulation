import { useRef, useEffect, useState } from "react";
import { EVENT_TYPE_ICON, EVENT_TYPE_COLOR } from "../../constants";
import type { WorldEvent } from "../../types";

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "conversation", label: "Chat" },
  { id: "trade", label: "Trade" },
  { id: "alliance", label: "Alliance" },
  { id: "build", label: "Build" },
  { id: "gather", label: "Gather" },
] as const;

export function EventFeed({ events }: { events: WorldEvent[] }) {
  const [filter, setFilter] = useState("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = filter === "all"
    ? events.filter((e) => e.type !== "tick_summary" && e.type !== "daily_summary")
    : events.filter((e) => e.type === filter);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered]);

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex gap-1 flex-wrap mb-0.5 shrink-0">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`px-2.5 py-1 text-[11px] rounded-full transition-colors cursor-pointer font-medium ${
              filter === opt.id
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div ref={scrollRef} className="flex flex-col gap-1 overflow-y-auto flex-1">
        {filtered.length === 0 && (
          <p className="text-xs text-neutral-400 italic py-2">No events match this filter</p>
        )}
        {filtered.map((event) => {
          const IconComponent = EVENT_TYPE_ICON[event.type];
          return (
            <div key={event._id} className="flex items-start gap-2 py-0.5">
              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${EVENT_TYPE_COLOR[event.type] ?? "bg-neutral-400"}`} />
              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                {IconComponent && (
                  <IconComponent className="w-3 h-3 mt-0.5 shrink-0 text-neutral-500" />
                )}
                <span className="text-[12px] text-neutral-700 leading-relaxed">
                  {event.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
