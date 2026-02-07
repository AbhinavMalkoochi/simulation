import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

type EconomyStats = NonNullable<FunctionReturnType<typeof api.analytics.stats.getEconomyStats>>;

const RESOURCE_COLORS: Record<string, string> = {
  wood: "bg-amber-700",
  stone: "bg-slate-500",
  food: "bg-orange-500",
  metal: "bg-gray-400",
  herbs: "bg-green-600",
};

function ResourceBar({ type, quantity, maxQuantity }: { type: string; quantity: number; maxQuantity: number }) {
  const pct = maxQuantity > 0 ? (quantity / maxQuantity) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-slate-400 w-10 shrink-0 capitalize">{type}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${RESOURCE_COLORS[type] ?? "bg-slate-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{Math.round(quantity)}</span>
    </div>
  );
}

export function EconomyDashboard({ stats }: { stats: EconomyStats | undefined }) {
  if (!stats) {
    return <p className="text-xs text-slate-600 italic">Loading economy data...</p>;
  }

  const maxResource = Math.max(...Object.values(stats.resourceTotals), 1);
  const maxWealth = stats.agentWealth.length > 0 ? Math.max(...stats.agentWealth.map((a) => a.total), 1) : 1;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          World Resources
        </h4>
        <div className="flex flex-col gap-1">
          {Object.entries(stats.resourceTotals).map(([type, qty]) => (
            <ResourceBar key={type} type={type} quantity={qty} maxQuantity={maxResource} />
          ))}
          {Object.keys(stats.resourceTotals).length === 0 && (
            <p className="text-[10px] text-slate-600 italic">No resources found</p>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Agent Wealth
        </h4>
        <div className="flex flex-col gap-1">
          {stats.agentWealth.slice(0, 8).map((agent) => (
            <div key={agent.name} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-12 shrink-0 truncate">{agent.name}</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-yellow-500" style={{ width: `${(agent.total / maxWealth) * 100}%` }} />
              </div>
              <span className="text-[10px] font-mono text-slate-500 w-6 text-right">{agent.total}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-800/40 rounded p-2">
          <div className="text-lg font-bold text-emerald-400">{stats.completedTrades}</div>
          <div className="text-[9px] text-slate-500">Trades Done</div>
        </div>
        <div className="bg-slate-800/40 rounded p-2">
          <div className="text-lg font-bold text-amber-400">{stats.pendingTrades}</div>
          <div className="text-[9px] text-slate-500">Pending</div>
        </div>
        <div className="bg-slate-800/40 rounded p-2">
          <div className="text-lg font-bold text-slate-400">{stats.totalTrades}</div>
          <div className="text-[9px] text-slate-500">Total</div>
        </div>
      </div>
    </div>
  );
}
