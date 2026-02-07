import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { WorldCanvas } from "./components/world/WorldCanvas";
import { ActivityFeed } from "./components/world/ActivityFeed";
import { Sidebar } from "./components/panels/Sidebar";
import { Toolbar } from "./components/ui/Toolbar";

export function App() {
  const worldState = useQuery(api.world.getState);
  const agents = useQuery(api.agents.list);
  const events = useQuery(api.events.recent);
  const resources = useQuery(api.world.getResources);
  const buildings = useQuery(api.world.getBuildings);
  const alliances = useQuery(api.world.getAlliances);
  const seedWorld = useMutation(api.init.seedWorld);
  const togglePause = useMutation(api.world.togglePause);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [directorMode, setDirectorMode] = useState(false);

  const directorAgentId = (() => {
    if (!directorMode || !agents?.length || !worldState) return null;
    const active = agents.filter((a) => a.status !== "idle" && a.status !== "sleeping");
    const pool = active.length > 0 ? active : agents;
    return pool[worldState.tick % pool.length]?._id ?? null;
  })();

  const effectiveAgentId = directorMode ? directorAgentId : selectedAgentId;

  if (worldState === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-lg font-medium animate-pulse">Connecting...</div>
      </div>
    );
  }

  if (worldState === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 bg-slate-950">
        <h1 className="text-4xl font-bold text-slate-100 tracking-tight">AgentWorld</h1>
        <p className="text-slate-400 max-w-md text-center leading-relaxed">
          A living simulation where AI agents build societies, trade resources,
          form alliances, and develop unique personalities.
        </p>
        <button
          onClick={() => seedWorld()}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Create World
        </button>
      </div>
    );
  }

  const selectedAgent = agents?.find((a) => a._id === effectiveAgentId) ?? null;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      <Toolbar
        tick={worldState.tick}
        timeOfDay={worldState.timeOfDay}
        weather={worldState.weather}
        paused={worldState.paused}
        agentCount={agents?.length ?? 0}
        directorMode={directorMode}
        onTogglePause={() => togglePause()}
        onToggleDirector={() => setDirectorMode((d) => !d)}
      />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <WorldCanvas
            agents={agents ?? []}
            resources={resources ?? []}
            buildings={buildings ?? []}
            events={events ?? []}
            alliances={(alliances ?? []).map((a) => ({ _id: a._id, name: a.name, memberIds: a.memberIds.map(String) }))}
            mapSeed={worldState.mapSeed}
            mapWidth={worldState.mapWidth}
            mapHeight={worldState.mapHeight}
            tileSize={worldState.tileSize}
            timeOfDay={worldState.timeOfDay}
            weather={worldState.weather}
            onAgentSelect={setSelectedAgentId}
          />
          <ActivityFeed events={events ?? []} />
        </div>
        <Sidebar
          selectedAgent={selectedAgent}
          agents={agents ?? []}
          events={events ?? []}
          worldState={worldState ? {
            tick: worldState.tick,
            timeOfDay: worldState.timeOfDay,
            weather: worldState.weather,
            season: worldState.season,
            paused: worldState.paused,
          } : null}
          buildingCount={buildings?.length ?? 0}
          allianceCount={alliances?.length ?? 0}
          onAgentSelect={setSelectedAgentId}
        />
      </div>
    </div>
  );
}
