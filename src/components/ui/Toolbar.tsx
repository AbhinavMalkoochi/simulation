import { formatTime } from "../../../convex/lib/utils";

interface ToolbarProps {
  tick: number;
  timeOfDay: number;
  weather: string;
  paused: boolean;
  agentCount: number;
  directorMode: boolean;
  sidebarOpen: boolean;
  onTogglePause: () => void;
  onToggleDirector: () => void;
  onToggleSidebar: () => void;
}

export function Toolbar({
  tick,
  timeOfDay,
  weather,
  paused,
  agentCount,
  directorMode,
  sidebarOpen,
  onTogglePause,
  onToggleDirector,
  onToggleSidebar,
}: ToolbarProps) {
  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-white/90 border-b border-neutral-200 backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-xs font-semibold tracking-widest text-neutral-900 uppercase">AgentWorld</h1>
        <div className="w-px h-4 bg-neutral-200" />
        <button
          onClick={onTogglePause}
          className="px-4 py-1.5 text-xs font-medium rounded-full border border-neutral-200 hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-700"
        >
          {paused ? "Play" : "Pause"}
        </button>
        <button
          onClick={onToggleDirector}
          className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${directorMode
              ? "bg-neutral-900 text-white"
              : "border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
            }`}
        >
          Director
        </button>
      </div>

      <div className="flex items-center gap-5 text-xs text-neutral-500">
        <span className="capitalize">{weather}</span>
        <span className="font-medium text-neutral-700">{formatTime(timeOfDay)}</span>
        <span>{agentCount} agents</span>
        <span className="text-neutral-400 font-mono text-[10px]">t{tick}</span>
        <div className="w-px h-4 bg-neutral-200" />
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-500"
          title={sidebarOpen ? "Hide panel" : "Show panel"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
            <line x1="10" y1="2.5" x2="10" y2="13.5" />
            {sidebarOpen ? (
              <path d="M12.5 7l-1.5 1 1.5 1" />
            ) : (
              <path d="M11.5 7l1.5 1-1.5 1" />
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
