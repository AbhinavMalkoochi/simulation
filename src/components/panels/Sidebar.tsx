import { EventFeed } from "./EventFeed";

interface Agent {
  _id: string;
  name: string;
  backstory: string;
  personality: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  position: { x: number; y: number };
  energy: number;
  emotion: { valence: number; arousal: number };
  status: string;
  currentAction?: string;
  skills: Record<string, number>;
  spriteSeed: number;
}

interface WorldEvent {
  _id: string;
  type: string;
  description: string;
  tick: number;
}

interface SidebarProps {
  selectedAgent: Agent | null;
  agents: Agent[];
  events: WorldEvent[];
  onAgentSelect: (agentId: string) => void;
}

const STATUS_BADGE: Record<string, string> = {
  idle: "bg-slate-600",
  moving: "bg-emerald-600",
  talking: "bg-blue-600",
  working: "bg-amber-600",
  sleeping: "bg-indigo-600",
  exploring: "bg-pink-600",
};

const TRAIT_LABELS: Record<string, string> = {
  openness: "OPN",
  conscientiousness: "CON",
  extraversion: "EXT",
  agreeableness: "AGR",
  neuroticism: "NEU",
};

function TraitBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-slate-500 w-6">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}

function AgentInspector({ agent }: { agent: Agent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full border-2 border-white/20"
          style={{
            backgroundColor: `#${[0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xf1c40f, 0x00bcd4, 0xff6b81][agent.spriteSeed % 10].toString(16).padStart(6, "0")}`,
          }}
        />
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{agent.name}</h3>
          <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded ${STATUS_BADGE[agent.status] ?? "bg-slate-600"} text-white`}>
            {agent.status}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{agent.backstory}</p>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Personality
        </h4>
        <div className="flex flex-col gap-1">
          {Object.entries(agent.personality).map(([trait, value]) => (
            <TraitBar key={trait} label={TRAIT_LABELS[trait] ?? trait} value={value} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">Energy</span>
          <div className="h-1.5 bg-slate-800 rounded-full mt-0.5">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${agent.energy}%` }}
            />
          </div>
        </div>
        <div>
          <span className="text-slate-500">Mood</span>
          <div className="h-1.5 bg-slate-800 rounded-full mt-0.5">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${((agent.emotion.valence + 1) / 2) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Position
        </h4>
        <span className="text-xs font-mono text-slate-400">
          ({agent.position.x}, {agent.position.y})
        </span>
      </div>
    </div>
  );
}

export function Sidebar({ selectedAgent, agents, events, onAgentSelect }: SidebarProps) {
  return (
    <aside className="w-72 bg-slate-900/60 border-l border-slate-800 flex flex-col overflow-hidden backdrop-blur-sm">
      {selectedAgent ? (
        <div className="p-3 border-b border-slate-800 overflow-y-auto shrink-0">
          <AgentInspector agent={selectedAgent} />
        </div>
      ) : (
        <div className="p-3 border-b border-slate-800">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Agents
          </h2>
          <div className="flex flex-col gap-0.5">
            {agents.map((agent) => (
              <button
                key={agent._id}
                onClick={() => onAgentSelect(agent._id)}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: `#${[0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xf1c40f, 0x00bcd4, 0xff6b81][agent.spriteSeed % 10].toString(16).padStart(6, "0")}`,
                  }}
                />
                <span className="text-xs text-slate-300">{agent.name}</span>
                <span className={`ml-auto px-1 py-0.5 text-[9px] rounded ${STATUS_BADGE[agent.status] ?? "bg-slate-600"} text-white`}>
                  {agent.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 flex-1 overflow-hidden flex flex-col">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Events
        </h2>
        <EventFeed events={events} />
      </div>
    </aside>
  );
}
