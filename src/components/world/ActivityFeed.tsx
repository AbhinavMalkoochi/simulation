import { useState } from "react";
import type { WorldEvent } from "../../types";

interface ActivityFeedProps {
  events: WorldEvent[];
  visible: boolean;
}

const MAX_EVENTS = 20;

const TYPE_DOT: Record<string, string> = {
  conversation: "bg-blue-400",
  gather: "bg-emerald-400",
  craft: "bg-amber-400",
  build: "bg-orange-400",
  trade: "bg-yellow-400",
  gift: "bg-rose-400",
  alliance: "bg-purple-400",
  god_action: "bg-neutral-400",
};

function EventRow({ event }: { event: WorldEvent }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = event.description.length > 60;
  const preview = isLong ? event.description.slice(0, 58) + "..." : event.description;

  return (
    <div className="flex items-start gap-2.5 py-1.5 px-3">
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${TYPE_DOT[event.type] ?? "bg-neutral-300"}`} />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-neutral-600 leading-relaxed">
          {expanded ? event.description : preview}
        </span>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] text-neutral-400 hover:text-neutral-600 ml-1 cursor-pointer transition-colors"
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
        className="absolute bottom-3 left-3 z-10 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-[11px] text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer"
      >
        Show events
      </button>
    ) : null;
  }

  const recentEvents = events
    .filter((e) => e.type !== "tick_summary" && e.type !== "world_created")
    .slice(0, MAX_EVENTS);

  if (recentEvents.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-3 z-10 w-[320px] max-h-[50vh] flex flex-col bg-white/92 backdrop-blur-md rounded-xl shadow-lg border border-neutral-200/60 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100 shrink-0">
        <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Events</span>
        <button
          onClick={() => setHidden(true)}
          className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer p-0.5"
          title="Hide events"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto flex-1 py-1">
        {recentEvents.map((event) => (
          <EventRow key={event._id} event={event} />
        ))}
      </div>
    </div>
  );
}
