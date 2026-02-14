import { useEffect, useRef } from "react";
import { EVENT_TYPE_ICON, EVENT_TYPE_COLOR } from "../../constants";
import type { WorldEvent } from "../../types";

interface ActivityFeedProps {
  events: WorldEvent[];
  visible: boolean;
  hidden: boolean;
  onToggle: () => void;
}

const MAX_EVENTS = 12;

function truncateEvent(description: string, maxLen = 70): string {
  return description.length > maxLen
    ? description.slice(0, maxLen - 1) + "…"
    : description;
}

export function ActivityFeed({ events, visible, hidden, onToggle }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const recentEvents = events
    .filter((e) => e.type !== "tick_summary" && e.type !== "world_created" && e.type !== "conversation")
    .slice(0, MAX_EVENTS);

  useEffect(() => {
    if (scrollRef.current && visible && !hidden) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [recentEvents, visible, hidden]);

  if (!visible) return null;

  if (hidden) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-xl rounded-full text-xs font-medium text-neutral-600 hover:text-neutral-800 hover:bg-white/90 transition-all cursor-pointer shadow-md shadow-black/8 border border-white/50"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="6" cy="6" r="4" />
          <circle cx="6" cy="6" r="1.5" fill="currentColor" />
        </svg>
        Events
      </button>
    );
  }

  if (recentEvents.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 z-10 w-[280px] max-h-[32vh] flex flex-col bg-white/85 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/10 border border-white/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 shrink-0">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Live Events</span>
        <button
          onClick={onToggle}
          className="text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer p-1 -mr-1 rounded-md hover:bg-neutral-100"
          title="Hide"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-neutral-200/50 mx-3" />

      {/* Scrollable list */}
      <div ref={scrollRef} className="overflow-y-auto flex-1 py-1.5">
        {recentEvents.map((event) => {
          const IconComponent = EVENT_TYPE_ICON[event.type];
          return (
            <div key={event._id} className="flex items-start gap-2.5 py-1 px-3.5 hover:bg-neutral-50/50 transition-colors">
              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${EVENT_TYPE_COLOR[event.type] ?? "bg-neutral-400"}`} />
              <div className="flex-1 min-w-0 flex items-start gap-1.5">
                {IconComponent && (
                  <IconComponent className="w-3 h-3 mt-0.5 shrink-0 text-neutral-500" />
                )}
                <span className="text-[12px] leading-relaxed text-neutral-700">
                  {truncateEvent(event.description)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
