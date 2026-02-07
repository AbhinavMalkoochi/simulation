import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { EventFeed } from "./EventFeed";
import { AgentInspector } from "./AgentInspector";
import { SocialGraph } from "./SocialGraph";
import { EconomyDashboard } from "./EconomyDashboard";
import { Newspaper } from "./Newspaper";
import { StoryNarrator } from "./StoryNarrator";
import { GodMode } from "./GodMode";
import { STATUS_BADGE, agentColorHex } from "../../types";
import type { AgentDoc, WorldEvent } from "../../types";

interface SidebarProps {
  selectedAgent: AgentDoc | null;
  agents: AgentDoc[];
  events: WorldEvent[];
  onAgentSelect: (agentId: string | null) => void;
}

const TABS = [
  { id: "agents", label: "Agents" },
  { id: "social", label: "Social" },
  { id: "economy", label: "Econ" },
  { id: "news", label: "News" },
  { id: "story", label: "Story" },
  { id: "god", label: "God" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Sidebar({ selectedAgent, agents, events, onAgentSelect }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>("agents");
  const relationships = useQuery(api.world.getRelationships);
  const alliances = useQuery(api.world.getAlliances);
  const economyStats = useQuery(api.analytics.stats.getEconomyStats);
  const newspaper = useQuery(api.analytics.newspaper.getLatestSummary);

  if (selectedAgent) {
    return (
      <aside className="w-80 bg-slate-900/60 border-l border-slate-800 flex flex-col overflow-hidden backdrop-blur-sm">
        <AgentInspector agent={selectedAgent} onClose={() => onAgentSelect(null)} />
        <div className="p-3 border-t border-slate-800 shrink-0 overflow-hidden flex flex-col" style={{ maxHeight: "30%" }}>
          <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Events</h2>
          <EventFeed events={events} />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-slate-900/60 border-l border-slate-800 flex flex-col overflow-hidden backdrop-blur-sm">
      <div className="flex border-b border-slate-800 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "agents" && (
          <div className="flex flex-col gap-0.5">
            {agents.map((agent) => (
              <button
                key={agent._id}
                onClick={() => onAgentSelect(agent._id)}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: agentColorHex(agent.spriteSeed) }}
                />
                <span className="text-xs text-slate-300 truncate flex-1">{agent.name}</span>
                <span className="text-[9px] text-slate-500 font-mono">{Math.round(agent.energy)}%</span>
                <span className={`px-1 py-0.5 text-[9px] rounded ${STATUS_BADGE[agent.status] ?? "bg-slate-600"} text-white shrink-0`}>
                  {agent.status}
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

        {activeTab === "news" && <Newspaper data={newspaper} />}

        {activeTab === "story" && <StoryNarrator />}

        {activeTab === "god" && <GodMode />}
      </div>

      <div className="p-3 border-t border-slate-800 shrink-0 overflow-hidden flex flex-col" style={{ maxHeight: "30%" }}>
        <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Events</h2>
        <EventFeed events={events} />
      </div>
    </aside>
  );
}
