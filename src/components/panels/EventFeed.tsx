import { useState } from "react";
import type { WorldEvent } from "../../types";

interface EventFeedProps {
  events: WorldEvent[];
}

const TYPE_DOT: Record<string, string> = {
  conversation: "bg-blue-400",
  trade: "bg-amber-400",
  alliance: "bg-purple-400",
  governance: "bg-violet-400",
  build: "bg-orange-400",
  gather: "bg-emerald-400",
  craft: "bg-cyan-400",
  gift: "bg-rose-400",
  god_action: "bg-yellow-400",
  world_created: "bg-emerald-400",
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
    <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0">
      <div className="flex gap-1 flex-wrap mb-1 shrink-0">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors cursor-pointer ${
              filter === opt.id
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-0.5 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-[11px] text-neutral-400 italic">No events match this filter</p>
        )}
        {filtered.map((event) => (
          <div key={event._id} className="flex items-start gap-2 py-0.5">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${TYPE_DOT[event.type] ?? "bg-neutral-300"}`} />
            <span className="text-[11px] text-neutral-600 leading-relaxed">{event.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
