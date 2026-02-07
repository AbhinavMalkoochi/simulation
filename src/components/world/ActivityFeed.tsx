import type { WorldEvent } from "../../types";

interface ActivityFeedProps {
  events: WorldEvent[];
}

const MAX_VISIBLE = 5;

function getEventIcon(type: string): string {
  const icons: Record<string, string> = {
    conversation: "💬",
    gather: "🌿",
    craft: "⚒️",
    build: "🏗️",
    trade: "🤝",
    gift: "🎁",
    alliance: "⚔️",
    god_action: "⚡",
    world_created: "🌍",
    tick_summary: "📋",
  };
  return icons[type] ?? "•";
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const recentEvents = events
    .filter((e) => e.type !== "tick_summary" && e.type !== "world_created")
    .slice(0, MAX_VISIBLE);

  if (recentEvents.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none z-10 max-w-xs">
      {recentEvents.map((event, i) => (
        <div
          key={event._id}
          className="flex items-start gap-1.5 px-2.5 py-1.5 bg-slate-950/70 backdrop-blur-sm rounded-lg border border-slate-800/50 animate-fade-in"
          style={{
            opacity: 1 - i * 0.15,
            animationDelay: `${i * 50}ms`,
          }}
        >
          <span className="text-xs shrink-0 mt-0.5">{getEventIcon(event.type)}</span>
          <span className="text-[10px] text-slate-300 leading-tight">
            {truncate(event.description, 80)}
          </span>
        </div>
      ))}
    </div>
  );
}
