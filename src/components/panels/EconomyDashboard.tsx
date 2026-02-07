import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

type EconomyStats = NonNullable<FunctionReturnType<typeof api.analytics.stats.getEconomyStats>>;

function ResourceBar({ type, quantity, maxQuantity }: { type: string; quantity: number; maxQuantity: number }) {
  const pct = maxQuantity > 0 ? (quantity / maxQuantity) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-neutral-500 w-12 shrink-0 capitalize">{type}</span>
      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-neutral-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-neutral-400 tabular-nums w-8 text-right">{Math.round(quantity)}</span>
    </div>
  );
}

export function EconomyDashboard({ stats }: { stats: EconomyStats | undefined }) {
  if (!stats) {
    return <p className="text-xs text-neutral-400">Loading economy data...</p>;
  }

  const maxResource = Math.max(...Object.values(stats.resourceTotals), 1);
  const maxWealth = stats.agentWealth.length > 0 ? Math.max(...stats.agentWealth.map((a) => a.total), 1) : 1;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h4 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">World Resources</h4>
        <div className="flex flex-col gap-1.5">
          {Object.entries(stats.resourceTotals).map(([type, qty]) => (
            <ResourceBar key={type} type={type} quantity={qty} maxQuantity={maxResource} />
          ))}
          {Object.keys(stats.resourceTotals).length === 0 && (
            <p className="text-[11px] text-neutral-400">No resources found</p>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Agent Wealth</h4>
        <div className="flex flex-col gap-1.5">
          {stats.agentWealth.slice(0, 8).map((agent) => (
            <div key={agent.name} className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-500 w-14 shrink-0 truncate">{agent.name}</span>
              <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-neutral-600" style={{ width: `${(agent.total / maxWealth) * 100}%` }} />
              </div>
              <span className="text-[10px] text-neutral-400 tabular-nums w-6 text-right">{agent.total}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-lg font-semibold text-neutral-900">{stats.completedTrades}</div>
          <div className="text-[10px] text-neutral-400">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-neutral-900">{stats.pendingTrades}</div>
          <div className="text-[10px] text-neutral-400">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-neutral-900">{stats.totalTrades}</div>
          <div className="text-[10px] text-neutral-400">Total</div>
        </div>
      </div>
    </div>
  );
}
