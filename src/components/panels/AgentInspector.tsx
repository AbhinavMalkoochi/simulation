import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface Agent {
  _id: Id<"agents">;
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
  currentPlan?: string;
  currentAction?: string;
  skills: Record<string, number>;
  spriteSeed: number;
}

const AGENT_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6,
  0x1abc9c, 0xe67e22, 0xf1c40f, 0x00bcd4, 0xff6b81,
];

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

function Bar({ label, value, color = "bg-emerald-500" }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-slate-500 w-7 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, value * 100)}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-600 w-6 text-right">{(value * 100).toFixed(0)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{title}</h4>
      {children}
    </div>
  );
}

export function AgentInspector({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const memories = useQuery(api.agents.getMemories, { agentId: agent._id, limit: 10 });
  const inventory = useQuery(api.world.getInventory, { agentId: agent._id });
  const conversations = useQuery(api.agents.getConversations, { agentId: agent._id });

  const color = `#${AGENT_COLORS[agent.spriteSeed % AGENT_COLORS.length].toString(16).padStart(6, "0")}`;

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full border-2 border-white/20 shrink-0"
            style={{ backgroundColor: color }}
          />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{agent.name}</h3>
            <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded ${STATUS_BADGE[agent.status] ?? "bg-slate-600"} text-white`}>
              {agent.status}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-400 text-sm cursor-pointer">✕</button>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{agent.backstory}</p>

      {agent.currentPlan && (
        <div className="px-2 py-1.5 bg-slate-800/50 rounded text-xs text-slate-300 italic">
          Plan: {agent.currentPlan}
        </div>
      )}

      <Section title="Personality">
        <div className="flex flex-col gap-1">
          {Object.entries(agent.personality).map(([trait, value]) => (
            <Bar key={trait} label={TRAIT_LABELS[trait] ?? trait} value={value} />
          ))}
        </div>
      </Section>

      <Section title="Vitals">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-500">Energy</span>
            <div className="h-1.5 bg-slate-800 rounded-full mt-0.5">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${agent.energy}%` }} />
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500">Mood</span>
            <div className="h-1.5 bg-slate-800 rounded-full mt-0.5">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${((agent.emotion.valence + 1) / 2) * 100}%` }} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Skills">
        <div className="flex flex-col gap-1">
          {Object.entries(agent.skills).map(([skill, level]) => (
            <Bar key={skill} label={skill.slice(0, 3).toUpperCase()} value={level / 5} color="bg-cyan-500" />
          ))}
        </div>
      </Section>

      {inventory && inventory.length > 0 && (
        <Section title="Inventory">
          <div className="flex flex-wrap gap-1">
            {inventory.map((item) => (
              <span key={item._id} className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300">
                {item.quantity} {item.itemType}
              </span>
            ))}
          </div>
        </Section>
      )}

      {memories && memories.length > 0 && (
        <Section title="Recent Memories">
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {memories.map((m) => (
              <div key={m._id} className="text-[10px] text-slate-400 leading-relaxed">
                <span className="text-slate-600 font-mono">[{m.tick}]</span>{" "}
                <span className={m.type === "reflection" ? "text-purple-400 italic" : ""}>{m.content}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {conversations && conversations.length > 0 && (
        <Section title="Recent Conversations">
          <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
            {conversations.slice(0, 3).map((conv) => (
              <div key={conv._id} className="text-[10px] text-slate-400">
                {conv.messages.slice(-3).map((msg, i) => (
                  <div key={i}>
                    <span className="text-slate-500 font-mono">[{msg.tick}]</span> {msg.content}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="text-[10px] text-slate-600 font-mono">
        pos ({agent.position.x}, {agent.position.y})
      </div>
    </div>
  );
}
