import type { WorldEvent } from "../../types";

interface ActivityFeedProps {
  events: WorldEvent[];
}

const MAX_VISIBLE = 4;

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

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "...";
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const recentEvents = events
    .filter((e) => e.type !== "tick_summary" && e.type !== "world_created")
    .slice(0, MAX_VISIBLE);

  if (recentEvents.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-3 flex flex-col gap-1 pointer-events-none z-10 max-w-[280px]">
      {recentEvents.map((event, i) => (
        <div
          key={event._id}
          className="flex items-start gap-2 px-3 py-1.5 bg-white/85 backdrop-blur-sm rounded-lg shadow-sm animate-fade-in"
          style={{ opacity: 1 - i * 0.2 }}
        >
          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${TYPE_DOT[event.type] ?? "bg-neutral-300"}`} />
          <span className="text-[10px] text-neutral-600 leading-relaxed">
            {truncate(event.description, 80)}
          </span>
        </div>
      ))}
    </div>
  );
}
