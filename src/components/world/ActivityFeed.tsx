import { useState } from "react";
import type { WorldEvent } from "../../types";

interface ActivityFeedProps {
  events: WorldEvent[];
  visible: boolean;
}

const MAX_EVENTS = 12;

const TYPE_COLOR: Record<string, string> = {
  conversation: "bg-blue-400",
  gather: "bg-emerald-400",
  craft: "bg-amber-400",
  build: "bg-orange-400",
  trade: "bg-yellow-400",
  gift: "bg-rose-400",
  alliance: "bg-purple-400",
  governance: "bg-violet-400",
  god_action: "bg-neutral-400",
};

function EventRow({ event }: { event: WorldEvent }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = event.description.length > 55;
  const preview = isLong ? event.description.slice(0, 53) + "…" : event.description;

  return (
    <div className="flex items-start gap-2 py-[3px] px-3 group">
      <div className={`w-[5px] h-[5px] rounded-full mt-[5px] shrink-0 opacity-80 ${TYPE_COLOR[event.type] ?? "bg-neutral-300"}`} />
      <div className="flex-1 min-w-0">
        <span className="text-[10.5px] leading-snug text-neutral-500">
          {expanded ? event.description : preview}
        </span>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[9px] text-neutral-300 hover:text-neutral-500 ml-1 cursor-pointer transition-colors"
          >
            {expanded ? "less" : "more"}
          </button>
        )}
      </div>
    </div>
  );
}

export function ActivityFeed({ events, visible }: ActivityFeedProps) {
  const [hidden, setHidden] = useState(false);

  if (!visible || hidden) {
    return visible ? (
      <button
        onClick={() => setHidden(false)}
        className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-xl rounded-full text-[10px] font-medium text-neutral-400 hover:text-neutral-600 hover:bg-white/85 transition-all cursor-pointer shadow-sm shadow-black/5 border border-white/40"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <circle cx="5" cy="5" r="3.5" />
          <circle cx="5" cy="5" r="1" fill="currentColor" />
        </svg>
        Events
      </button>
    ) : null;
  }

  const recentEvents = events
    .filter((e) => e.type !== "tick_summary" && e.type !== "world_created")
    .slice(0, MAX_EVENTS);

  if (recentEvents.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 z-10 w-[240px] max-h-[28vh] flex flex-col bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/6 border border-white/40 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0">
        <span className="text-[9px] font-semibold text-neutral-400/80 uppercase tracking-[0.12em]">Events</span>
        <button
          onClick={() => setHidden(true)}
          className="text-neutral-300 hover:text-neutral-500 transition-colors cursor-pointer p-0.5 -mr-0.5"
          title="Hide"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M1.5 1.5l6 6M7.5 1.5l-6 6" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-neutral-200/30 mx-2" />

      {/* Scrollable list */}
      <div className="overflow-y-auto flex-1 py-1">
        {recentEvents.map((event) => (
          <EventRow key={event._id} event={event} />
        ))}
      </div>
    </div>
  );
}
