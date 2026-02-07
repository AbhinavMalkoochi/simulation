import { useState, useEffect, useRef } from "react";
import { MessageSquare, Handshake, Sword, Vote, Building2, Sprout, Hammer, Gift, Zap, Globe, AlertCircle, Flag } from "lucide-react";
import type { WorldEvent } from "../../types";

interface EventFeedProps {
  events: WorldEvent[];
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  conversation: MessageSquare,
  trade: Handshake,
  alliance: Sword,
  governance: Vote,
  build: Building2,
  gather: Sprout,
  craft: Hammer,
  gift: Gift,
  god_action: Zap,
  world_created: Globe,
  conflict: AlertCircle,
  territory: Flag,
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = filter === "all"
    ? events.filter((e) => e.type !== "tick_summary")
    : events.filter((e) => e.type === filter);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered]);

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
      <div ref={scrollRef} className="flex flex-col gap-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-neutral-400 italic py-2">No events match this filter</p>
        )}
        {filtered.map((event) => {
          const IconComponent = TYPE_ICON[event.type];
          return (
            <div key={event._id} className="flex items-start gap-2 py-0.5">
              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${TYPE_DOT[event.type] ?? "bg-neutral-400"}`} />
              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                {IconComponent && (
                  <IconComponent className="w-3 h-3 mt-0.5 shrink-0 text-neutral-500 flex-shrink-0" />
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
