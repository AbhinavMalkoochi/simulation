import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { WorldCanvas } from "./components/world/WorldCanvas";
import { ActivityFeed } from "./components/world/ActivityFeed";
import { ConversationLog } from "./components/world/ConversationLog";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activityFeedHidden, setActivityFeedHidden] = useState(false);

  const directorAgentId = useMemo(() => {
    if (!directorMode || !agents?.length || !worldState) return null;
    const active = agents.filter((a) => a.status !== "idle" && a.status !== "sleeping");
    const pool = active.length > 0 ? active : agents;
    return pool[worldState.tick % pool.length]?._id ?? null;
  }, [directorMode, agents, worldState]);

  const effectiveAgentId = directorMode ? directorAgentId : selectedAgentId;

  if (worldState === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-sm font-medium text-neutral-400 animate-pulse tracking-wide">Connecting...</div>
      </div>
    );
  }

  if (worldState === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-8 bg-white">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">AgentWorld</h1>
          <p className="text-sm text-neutral-500 mt-3 max-w-sm leading-relaxed">
            A living simulation where AI agents build societies, trade resources, and develop unique personalities.
          </p>
        </div>
        <button
          onClick={() => seedWorld()}
          className="px-8 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-full transition-colors cursor-pointer"
        >
          Create World
        </button>
      </div>
    );
  }

  const allianceData = useMemo(
    () => (alliances ?? []).map((a) => ({ _id: a._id, name: a.name, memberIds: a.memberIds.map(String) })),
    [alliances],
  );

  const selectedAgent = agents?.find((a) => a._id === effectiveAgentId) ?? null;

  return (
    <div className="h-screen flex flex-col bg-neutral-50">
      <Toolbar
        tick={worldState.tick}
        timeOfDay={worldState.timeOfDay}
        weather={worldState.weather}
        paused={worldState.paused}
        agentCount={agents?.length ?? 0}
        directorMode={directorMode}
        sidebarOpen={sidebarOpen}
        onTogglePause={() => togglePause()}
        onToggleDirector={() => setDirectorMode((d) => !d)}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
      />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 relative min-w-0 bg-[#2d6b3f]">
          <WorldCanvas
            agents={agents ?? []}
            resources={resources ?? []}
            buildings={buildings ?? []}
            events={events ?? []}
            alliances={allianceData}
            mapSeed={worldState.mapSeed}
            mapWidth={worldState.mapWidth}
            mapHeight={worldState.mapHeight}
            tileSize={worldState.tileSize}
            timeOfDay={worldState.timeOfDay}
            weather={worldState.weather}
            onAgentSelect={(id) => {
              setSelectedAgentId(id);
              if (id !== null) {
                setSidebarOpen(true);
              }
            }}
          />
          <ActivityFeed
            events={events ?? []}
            visible={!sidebarOpen}
            hidden={activityFeedHidden}
            onToggle={() => setActivityFeedHidden((h) => !h)}
          />
          <ConversationLog events={events ?? []} agents={agents ?? []} />
        </div>
        {sidebarOpen && (
          <Sidebar
            selectedAgent={selectedAgent}
            agents={agents ?? []}
            events={events ?? []}
            worldState={worldState}
            buildingCount={buildings?.length ?? 0}
            allianceCount={alliances?.length ?? 0}
            onAgentSelect={setSelectedAgentId}
          />
        )}
      </div>
    </div>
  );
}
