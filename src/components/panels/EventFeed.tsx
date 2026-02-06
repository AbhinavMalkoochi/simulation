interface WorldEvent {
  _id: string;
  type: string;
  description: string;
  tick: number;
}

interface EventFeedProps {
  events: WorldEvent[];
}

const TYPE_COLORS: Record<string, string> = {
  world_created: "text-emerald-400",
  tick_summary: "text-slate-500",
  agent_moved: "text-blue-400",
  trade: "text-amber-400",
  conversation: "text-purple-400",
  alliance: "text-pink-400",
};

export function EventFeed({ events }: EventFeedProps) {
  return (
    <div className="flex flex-col gap-1 overflow-y-auto max-h-64 pr-1">
      {events.length === 0 && (
        <p className="text-xs text-slate-600 italic">No events yet</p>
      )}
      {events.map((event) => (
        <div key={event._id} className="text-xs leading-relaxed">
          <span className={`font-mono mr-1 ${TYPE_COLORS[event.type] ?? "text-slate-500"}`}>
            [{event.tick}]
          </span>
          <span className="text-slate-300">{event.description}</span>
        </div>
      ))}
    </div>
  );
}
