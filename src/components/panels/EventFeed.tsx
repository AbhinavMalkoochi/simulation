import { useState } from "react";
import type { WorldEvent } from "../../types";

interface EventFeedProps {
  events: WorldEvent[];
}

const TYPE_COLORS: Record<string, string> = {
  world_created: "text-emerald-400",
  tick_summary: "text-slate-600",
  conversation: "text-purple-400",
  trade: "text-amber-400",
  alliance: "text-pink-400",
  governance: "text-violet-400",
  build: "text-orange-400",
  gather: "text-green-400",
  craft: "text-cyan-400",
  gift: "text-rose-400",
  god_action: "text-yellow-300",
};

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "conversation", label: "Chat" },
  { id: "trade", label: "Trade" },
  { id: "alliance", label: "Alliance" },
  { id: "build", label: "Build" },
  { id: "gather", label: "Gather" },
] as const;

export function EventFeed({ events }: EventFeedProps) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? events.filter((e) => e.type !== "tick_summary")
    : events.filter((e) => e.type === filter);

  return (
    <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0">
      <div className="flex gap-1 flex-wrap mb-1 shrink-0">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`px-1.5 py-0.5 text-[9px] rounded transition-colors cursor-pointer ${
              filter === opt.id
                ? "bg-slate-700 text-slate-200"
                : "bg-slate-800/40 text-slate-500 hover:text-slate-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-0.5 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="text-[10px] text-slate-600 italic">No events match this filter</p>
        )}
        {filtered.map((event) => (
          <div key={event._id} className="text-[10px] leading-relaxed">
            <span className={`font-mono mr-1 ${TYPE_COLORS[event.type] ?? "text-slate-500"}`}>
              [{event.tick}]
            </span>
            <span className="text-slate-300">{event.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
