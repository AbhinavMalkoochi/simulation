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
    <div className="flex flex-col gap-5">
      <div>
        <h4 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Weather</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {WEATHERS.map((w) => (
            <button
              key={w}
              onClick={() => changeWeather({ weather: w })}
              className="px-3 py-2 text-xs bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors capitalize cursor-pointer text-neutral-700"
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Spawn Resource</h4>
        <div className="grid grid-cols-3 gap-1.5">
          {RESOURCES.map((r) => (
            <button
              key={r}
              onClick={() => spawnResource({ tileX: 40, tileY: 40, type: r, quantity: 5 })}
              className="px-2 py-2 text-xs bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors capitalize cursor-pointer text-neutral-700"
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-neutral-100">
        <h4 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Danger Zone</h4>
        <button
          onClick={async () => {
            if (confirm("This will destroy the current world. Continue?")) {
              await resetWorld({});
              await seedWorld();
            }
          }}
          className="w-full px-3 py-2 text-xs border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
        >
          Reset World
        </button>
      </div>
    </div>
  );
}
