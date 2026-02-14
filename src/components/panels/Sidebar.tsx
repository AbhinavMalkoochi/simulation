import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { EventFeed } from "./EventFeed";
import { AgentInspector } from "./AgentInspector";
import { SocialGraph } from "./SocialGraph";
import { EconomyDashboard } from "./EconomyDashboard";
import { Newspaper } from "./Newspaper";
import { GodMode } from "./GodMode";
import { WorldOverview } from "./WorldOverview";
import { AgentAvatar } from "../ui/AgentAvatar";
import type { AgentDoc, WorldEvent, WorldStateDoc } from "../../types";

interface SidebarProps {
  selectedAgent: AgentDoc | null;
  agents: AgentDoc[];
  events: WorldEvent[];
  worldState: WorldStateDoc | null;
  buildingCount: number;
  allianceCount: number;
  onAgentSelect: (agentId: string | null) => void;
}

const TABS = [
  { id: "world", label: "World" },
  { id: "agents", label: "Agents" },
  { id: "social", label: "Social" },
  { id: "economy", label: "Economy" },
  { id: "chronicle", label: "Chronicle" },
  { id: "events", label: "Events" },
  { id: "god", label: "Control" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_LABEL: Record<string, string> = {
  idle: "Idle",
  moving: "Moving",
  talking: "Talking",
  working: "Working",
  sleeping: "Sleeping",
  exploring: "Exploring",
};

export function Sidebar({ selectedAgent, agents, events, worldState, buildingCount, allianceCount, onAgentSelect }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>("world");
  const relationships = useQuery(api.world.getRelationships);
  const alliances = useQuery(api.world.getAlliances);
  const economyStats = useQuery(api.analytics.stats.getEconomyStats);

  if (selectedAgent) {
    return (
      <aside className="w-80 bg-white border-l border-neutral-200 flex flex-col overflow-hidden">
        <AgentInspector agent={selectedAgent} onClose={() => onAgentSelect(null)} />
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white border-l border-neutral-200 flex flex-col overflow-hidden">
      <div className="flex border-b border-neutral-100 shrink-0 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-1.5 py-2.5 text-[10px] font-medium tracking-wide transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "text-neutral-900 border-b-2 border-neutral-900"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "world" && worldState && (
          <WorldOverview
            tick={worldState.tick}
            timeOfDay={worldState.timeOfDay}
            weather={worldState.weather}
            season={worldState.season}
            paused={worldState.paused}
            agents={agents}
            buildingCount={buildingCount}
            allianceCount={allianceCount}
          />
        )}

        {activeTab === "agents" && (
          <div className="flex flex-col gap-0.5">
            {agents.map((agent) => (
              <button
                key={agent._id}
                onClick={() => onAgentSelect(agent._id)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors text-left cursor-pointer group"
              >
                <AgentAvatar spriteSeed={agent.spriteSeed} size={24} className="shrink-0" />
                <span className="text-sm text-neutral-800 flex-1 font-medium">{agent.name}</span>
                <span className="text-[11px] text-neutral-400 tabular-nums">{Math.round(agent.energy)}%</span>
                <span className="text-[10px] text-neutral-400">
                  {STATUS_LABEL[agent.status] ?? agent.status}
                </span>
              </button>
            ))}
          </div>
        )}

        {activeTab === "social" && (
          <SocialGraph
            agents={agents.map((a) => ({ _id: a._id, name: a.name, spriteSeed: a.spriteSeed }))}
            relationships={relationships ?? []}
            alliances={alliances ?? []}
          />
        )}

        {activeTab === "economy" && <EconomyDashboard stats={economyStats} />}

        {activeTab === "chronicle" && <Newspaper />}

        {activeTab === "events" && <EventFeed events={events} />}

        {activeTab === "god" && <GodMode />}
      </div>
    </aside>
  );
}
