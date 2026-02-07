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

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-neutral-400 tracking-wide">{label}</span>
      <span className="text-lg font-semibold text-neutral-900 leading-tight">{value}</span>
      {sub && <span className="text-[10px] text-neutral-400">{sub}</span>}
    </div>
  );
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
    <div className="flex flex-col gap-6">
      {/* Day header */}
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-2xl font-semibold text-neutral-900 tracking-tight">Day {day}</h3>
          {paused && (
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Paused</span>
          )}
        </div>
        <p className="text-sm text-neutral-500 mt-0.5 capitalize">
          {season} &middot; {formatTime(timeOfDay)} &middot; {weather}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Agents" value={agents.length} />
        <Stat label="Energy" value={`${avgEnergy}%`} />
        <Stat label="Buildings" value={buildingCount} />
        <Stat label="Alliances" value={allianceCount} />
      </div>

      {/* Status breakdown */}
      <div>
        <h4 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Activity</h4>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(statusCounts).map(([status, count]) => (
            <span
              key={status}
              className="px-2 py-1 bg-neutral-100 rounded-md text-[11px] text-neutral-600 capitalize"
            >
              {count} {status}
            </span>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div>
        <h4 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Population</h4>
        <div className="flex flex-col gap-1">
          {agents.map((agent) => (
            <div key={agent._id} className="flex items-center gap-2.5 py-0.5">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: agentColorHex(agent.spriteSeed) }}
              />
              <span className="text-xs text-neutral-700 flex-1">{agent.name}</span>
              <span className="text-[10px] text-neutral-400 tabular-nums">{Math.round(agent.energy)}%</span>
              <span className="text-[10px] text-neutral-400 capitalize w-14 text-right">{agent.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-neutral-300 font-mono text-center pt-2">
        tick {tick}
      </div>
    </div>
  );
}
