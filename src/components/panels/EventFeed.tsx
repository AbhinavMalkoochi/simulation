import { useState } from "react";
import type { WorldEvent } from "../../types";

interface EventFeedProps {
  events: WorldEvent[];
}

const TYPE_ICON: Record<string, string> = {
  conversation: "💬",
  trade: "🤝",
  alliance: "⚔️",
  governance: "🗳",
  build: "🏗",
  gather: "🌿",
  craft: "🔨",
  gift: "🎁",
  god_action: "⚡",
  world_created: "🌍",
  conflict: "😤",
  territory: "🚩",
};

const TYPE_DOT: Record<string, string> = {
  conversation: "bg-blue-500",
  trade: "bg-amber-500",
  alliance: "bg-purple-500",
  governance: "bg-violet-500",
  build: "bg-orange-500",
  gather: "bg-emerald-500",
  craft: "bg-cyan-500",
  gift: "bg-rose-500",
  god_action: "bg-yellow-500",
  world_created: "bg-emerald-500",
  conflict: "bg-red-500",
  territory: "bg-cyan-600",
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
    <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
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
      <div className="flex flex-col gap-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-neutral-400 italic py-2">No events match this filter</p>
        )}
        {filtered.map((event) => (
          <div key={event._id} className="flex items-start gap-2 py-0.5">
            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${TYPE_DOT[event.type] ?? "bg-neutral-400"}`} />
            <span className="text-[12px] text-neutral-700 leading-relaxed">
              {TYPE_ICON[event.type] ? `${TYPE_ICON[event.type]} ` : ""}
              {event.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
