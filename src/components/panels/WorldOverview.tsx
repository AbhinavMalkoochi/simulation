import { agentColorHex } from "../../types";
import type { AgentDoc } from "../../types";

const TICKS_PER_DAY = 192;

function formatTime(timeOfDay: number): string {
  const hours = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay - hours) * 60);
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getTimeEmoji(timeOfDay: number): string {
  if (timeOfDay >= 6 && timeOfDay < 10) return "🌅";
  if (timeOfDay >= 10 && timeOfDay < 17) return "☀️";
  if (timeOfDay >= 17 && timeOfDay < 20) return "🌇";
  return "🌙";
}

function getWeatherEmoji(weather: string): string {
  const map: Record<string, string> = { clear: "☀️", rain: "🌧️", storm: "⛈️", fog: "🌫️" };
  return map[weather] ?? "🌤️";
}

function getSeasonEmoji(season: string): string {
  const map: Record<string, string> = { spring: "🌸", summer: "☀️", autumn: "🍂", winter: "❄️" };
  return map[season] ?? "🌿";
}

interface WorldOverviewProps {
  tick: number;
  timeOfDay: number;
  weather: string;
  season: string;
  paused: boolean;
  agents: AgentDoc[];
  buildingCount: number;
  allianceCount: number;
}

export function WorldOverview({
  tick,
  timeOfDay,
  weather,
  season,
  paused,
  agents,
  buildingCount,
  allianceCount,
}: WorldOverviewProps) {
  const day = Math.floor(tick / TICKS_PER_DAY) + 1;

  const statusCounts: Record<string, number> = {};
  for (const agent of agents) {
    statusCounts[agent.status] = (statusCounts[agent.status] ?? 0) + 1;
  }

  const avgEnergy = agents.length > 0
    ? Math.round(agents.reduce((sum, a) => sum + a.energy, 0) / agents.length)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Time & Day */}
      <div className="bg-slate-800/40 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-100">
            {getTimeEmoji(timeOfDay)} Day {day}
          </h3>
          {paused && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-600 text-white rounded">
              PAUSED
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/60 rounded px-2 py-1.5">
            <div className="text-[10px] text-slate-500">Time</div>
            <div className="text-xs font-mono text-slate-200">{formatTime(timeOfDay)}</div>
          </div>
          <div className="bg-slate-800/60 rounded px-2 py-1.5">
            <div className="text-[10px] text-slate-500">Season</div>
            <div className="text-xs text-slate-200">{getSeasonEmoji(season)} {season}</div>
          </div>
          <div className="bg-slate-800/60 rounded px-2 py-1.5">
            <div className="text-[10px] text-slate-500">Weather</div>
            <div className="text-xs text-slate-200">{getWeatherEmoji(weather)} {weather}</div>
          </div>
        </div>
      </div>

      {/* Population */}
      <div className="bg-slate-800/40 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Population</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/60 rounded px-2 py-1.5 text-center">
            <div className="text-lg font-bold text-slate-100">{agents.length}</div>
            <div className="text-[10px] text-slate-500">Agents</div>
          </div>
          <div className="bg-slate-800/60 rounded px-2 py-1.5 text-center">
            <div className="text-lg font-bold text-amber-400">{avgEnergy}%</div>
            <div className="text-[10px] text-slate-500">Avg Energy</div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(statusCounts).map(([status, count]) => (
            <span
              key={status}
              className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300"
            >
              {count} {status}
            </span>
          ))}
        </div>
      </div>

      {/* Community Stats */}
      <div className="bg-slate-800/40 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Community</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/60 rounded px-2 py-1.5 text-center">
            <div className="text-lg font-bold text-cyan-400">{buildingCount}</div>
            <div className="text-[10px] text-slate-500">Buildings</div>
          </div>
          <div className="bg-slate-800/60 rounded px-2 py-1.5 text-center">
            <div className="text-lg font-bold text-purple-400">{allianceCount}</div>
            <div className="text-[10px] text-slate-500">Alliances</div>
          </div>
        </div>
      </div>

      {/* Agent Mini-list */}
      <div className="bg-slate-800/40 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Agents</h3>
        <div className="flex flex-col gap-1">
          {agents.map((agent) => (
            <div key={agent._id} className="flex items-center gap-2 text-[10px]">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: agentColorHex(agent.spriteSeed) }}
              />
              <span className="text-slate-300 flex-1 truncate">{agent.name}</span>
              <span className="text-slate-600 font-mono">{Math.round(agent.energy)}%</span>
              <span className="text-slate-500">{agent.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-slate-600 font-mono text-center">
        tick {tick}
      </div>
    </div>
  );
}
