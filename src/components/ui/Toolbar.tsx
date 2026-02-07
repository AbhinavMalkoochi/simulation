import { formatTime } from "../../../convex/lib/utils";

interface ToolbarProps {
  tick: number;
  timeOfDay: number;
  weather: string;
  paused: boolean;
  agentCount: number;
  directorMode: boolean;
  onTogglePause: () => void;
  onToggleDirector: () => void;
}

const WEATHER_ICONS: Record<string, string> = {
  clear: "☀",
  rain: "🌧",
  storm: "⛈",
  fog: "🌫",
};

export function Toolbar({
  tick,
  timeOfDay,
  weather,
  paused,
  agentCount,
  directorMode,
  onTogglePause,
  onToggleDirector,
}: ToolbarProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold tracking-wide text-emerald-400">AGENTWORLD</h1>
        <span className="w-px h-4 bg-slate-700" />
        <button
          onClick={onTogglePause}
          className="px-3 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          {paused ? "▶ Play" : "⏸ Pause"}
        </button>
        <button
          onClick={onToggleDirector}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
            directorMode
              ? "bg-emerald-700 text-white"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300"
          }`}
        >
          🎬 Director
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
