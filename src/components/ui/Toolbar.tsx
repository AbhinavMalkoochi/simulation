interface ToolbarProps {
  tick: number;
  timeOfDay: number;
  weather: string;
  paused: boolean;
  agentCount: number;
  onTogglePause: () => void;
}

const WEATHER_ICONS: Record<string, string> = {
  clear: "☀",
  rain: "🌧",
  storm: "⛈",
  fog: "🌫",
};

function formatTime(t: number): string {
  const hours = Math.floor(t);
  const minutes = Math.floor((t % 1) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function Toolbar({
  tick,
  timeOfDay,
  weather,
  paused,
  agentCount,
  onTogglePause,
}: ToolbarProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold tracking-wide text-emerald-400">
          AGENTWORLD
        </h1>
        <span className="w-px h-4 bg-slate-700" />
        <button
          onClick={onTogglePause}
          className="px-3 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          {paused ? "▶ Play" : "⏸ Pause"}
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
        <span>
          {WEATHER_ICONS[weather] ?? "?"} {weather}
        </span>
        <span>{formatTime(timeOfDay)}</span>
        <span className="text-slate-500">tick {tick}</span>
        <span>{agentCount} agents</span>
      </div>
    </header>
  );
}
