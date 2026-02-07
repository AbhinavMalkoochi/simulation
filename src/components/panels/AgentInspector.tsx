import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { agentColorHex } from "../../types";
import { InterviewChat } from "./InterviewChat";
import type { AgentDoc } from "../../types";

const TRAIT_LABELS: Record<string, string> = {
  openness: "Open",
  conscientiousness: "Consc",
  extraversion: "Extra",
  agreeableness: "Agree",
  neuroticism: "Neuro",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "Idle",
  moving: "Moving",
  talking: "Talking",
  working: "Working",
  sleeping: "Sleeping",
  exploring: "Exploring",
};

function Bar({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-neutral-400 w-10 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${accent ? "bg-neutral-600" : "bg-neutral-400"}`}
          style={{ width: `${Math.max(4, value * 100)}%` }}
        />
      </div>
      <span className="text-[10px] text-neutral-400 tabular-nums w-7 text-right">{(value * 100).toFixed(0)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}

export function AgentInspector({ agent, onClose }: { agent: AgentDoc; onClose: () => void }) {
  const memories = useQuery(api.agents.getMemories, { agentId: agent._id, limit: 10 });
  const inventory = useQuery(api.world.getInventory, { agentId: agent._id });
  const conversations = useQuery(api.agents.getConversations, { agentId: agent._id });
  const reputations = useQuery(api.world.getReputations);
  const agentReputation = reputations?.find((r) => r.agentId === agent._id);

  const color = agentColorHex(agent.spriteSeed);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <div>
            <h3 className="text-base font-semibold text-neutral-900">{agent.name}</h3>
            <span className="text-xs text-neutral-500">
              {STATUS_LABEL[agent.status] ?? agent.status}
              {agentReputation ? ` · Rep ${agentReputation.score.toFixed(1)}` : ""}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-sm cursor-pointer p-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed">{agent.backstory}</p>

      {agent.currentPlan && (
        <div className="px-3 py-2 bg-neutral-50 rounded-lg text-xs text-neutral-600 border border-neutral-100">
          {agent.currentPlan}
        </div>
      )}

      {/* Vitals */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-neutral-400">Energy</span>
          <div className="h-1.5 bg-neutral-100 rounded-full mt-1">
            <div
              className="h-full bg-neutral-800 rounded-full transition-all"
              style={{ width: `${agent.energy}%` }}
            />
          </div>
          <span className="text-[10px] text-neutral-400 tabular-nums">{Math.round(agent.energy)}%</span>
        </div>
        <div>
          <span className="text-[10px] text-neutral-400">Mood</span>
          <div className="h-1.5 bg-neutral-100 rounded-full mt-1">
            <div
              className="h-full bg-neutral-500 rounded-full transition-all"
              style={{ width: `${((agent.emotion.valence + 1) / 2) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-neutral-400 tabular-nums">{((agent.emotion.valence + 1) / 2 * 100).toFixed(0)}%</span>
        </div>
      </div>

      <Section title="Personality">
        <div className="flex flex-col gap-1">
          {Object.entries(agent.personality).map(([trait, value]) => (
            <Bar key={trait} label={TRAIT_LABELS[trait] ?? trait} value={value} />
          ))}
        </div>
      </Section>

      <Section title="Skills">
        <div className="flex flex-col gap-1">
          {Object.entries(agent.skills).map(([skill, level]) => (
            <Bar key={skill} label={skill.slice(0, 5)} value={level / 5} accent />
          ))}
        </div>
      </Section>

      {inventory && inventory.length > 0 && (
        <Section title="Inventory">
          <div className="flex flex-wrap gap-1.5">
            {inventory.map((item) => (
              <span key={item._id} className="px-2 py-1 bg-neutral-100 rounded-md text-[11px] text-neutral-600">
                {item.quantity} {item.itemType}
              </span>
            ))}
          </div>
        </Section>
      )}

      {memories && memories.length > 0 && (
        <Section title="Recent Memories">
          <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
            {memories.map((m) => (
              <div key={m._id} className="text-[11px] text-neutral-500 leading-relaxed">
                <span className="text-neutral-300 font-mono text-[9px] mr-1">{m.tick}</span>
                <span className={m.type === "reflection" ? "text-neutral-700 italic" : ""}>{m.content}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {conversations && conversations.length > 0 && (
        <Section title="Conversations">
          <div className="flex flex-col gap-2 max-h-28 overflow-y-auto">
            {conversations.slice(0, 3).map((conv) => (
              <div key={conv._id} className="text-[11px] text-neutral-500 leading-relaxed">
                {conv.messages.slice(-3).map((msg, i) => (
                  <div key={i}>
                    <span className="text-neutral-300 font-mono text-[9px] mr-1">{msg.tick}</span>
                    {msg.content}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Interview">
        <div className="h-48">
          <InterviewChat key={agent._id} agentId={agent._id} agentName={agent.name} />
        </div>
      </Section>

      <div className="text-[10px] text-neutral-300 font-mono text-center">
        ({agent.position.x}, {agent.position.y})
      </div>
    </div>
  );
}
