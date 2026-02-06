import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const WEATHERS = ["clear", "rain", "storm", "fog"] as const;
const RESOURCES = ["wood", "stone", "food", "metal", "herbs"] as const;

export function GodMode() {
  const changeWeather = useMutation(api.god.changeWeather);
  const spawnResource = useMutation(api.god.spawnResource);
  const resetWorld = useMutation(api.god.resetWorld);
  const seedWorld = useMutation(api.init.seedWorld);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Weather Control
        </h4>
        <div className="grid grid-cols-2 gap-1">
          {WEATHERS.map((w) => (
            <button
              key={w}
              onClick={() => changeWeather({ weather: w })}
              className="px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors capitalize cursor-pointer"
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Spawn Resource (center of map)
        </h4>
        <div className="grid grid-cols-3 gap-1">
          {RESOURCES.map((r) => (
            <button
              key={r}
              onClick={() => spawnResource({ tileX: 25, tileY: 25, type: r, quantity: 5 })}
              className="px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded transition-colors capitalize cursor-pointer"
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800">
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Danger Zone
        </h4>
        <button
          onClick={async () => {
            if (confirm("This will destroy the current world. Continue?")) {
              await resetWorld();
              await seedWorld();
            }
          }}
          className="w-full px-2 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-colors cursor-pointer"
        >
          Reset World
        </button>
      </div>
    </div>
  );
}
