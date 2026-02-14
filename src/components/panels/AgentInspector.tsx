import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { InterviewChat } from "./InterviewChat";
import { AgentAvatar } from "../ui/AgentAvatar";
import { STATUS_LABEL } from "../../constants";
import type { AgentDoc } from "../../types";

const TRAIT_LABELS: Record<string, string> = {
  openness: "Open",
  conscientiousness: "Consc",
  extraversion: "Extra",
  agreeableness: "Agree",
  neuroticism: "Neuro",
};

const BELIEF_CATEGORY_STYLE: Record<string, string> = {
  value: "bg-blue-100 text-blue-700",
  opinion: "bg-amber-100 text-amber-700",
  philosophy: "bg-purple-100 text-purple-700",
  goal: "bg-emerald-100 text-emerald-700",
};

function Bar({ label, value, max = 1, accent = false }: { label: string; value: number; max?: number; accent?: boolean }) {
  const pct = Math.max(4, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-neutral-400 w-10 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${accent ? "bg-neutral-600" : "bg-neutral-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-neutral-400 tabular-nums w-7 text-right">
        {max === 1 ? (value * 100).toFixed(0) : value.toFixed(1)}
      </span>
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

function describeMood(valence: number, arousal: number): string {
  if (valence > 0.3 && arousal > 0.5) return "Excited";
  if (valence > 0.3) return "Content";
  if (valence < -0.3 && arousal > 0.5) return "Anxious";
  if (valence < -0.3) return "Sad";
  if (arousal > 0.7) return "Alert";
  return "Calm";
}

function deriveArchetype(agent: AgentDoc): string {
  const { personality } = agent;
  if (personality.extraversion > 0.7 && personality.agreeableness > 0.6) return "Socialite";
  if (personality.extraversion < 0.3 && personality.openness > 0.6) return "Philosopher";
  if (personality.conscientiousness > 0.7) return "Builder";
  if (personality.openness > 0.7) return "Explorer";
  if (personality.agreeableness > 0.7) return "Caretaker";
  if (personality.neuroticism > 0.7) return "Sensitive Soul";
  if (personality.extraversion < 0.3) return "Hermit";
  return "Adaptable";
}

export function AgentInspector({ agent, onClose }: { agent: AgentDoc; onClose: () => void }) {
  const memories = useQuery(api.agents.getMemories, { agentId: agent._id, limit: 8 });
  const inventory = useQuery(api.world.getInventory, { agentId: agent._id });
  const conversations = useQuery(api.agents.getConversations, { agentId: agent._id });
  const beliefs = useQuery(api.agents.getBeliefs, { agentId: agent._id });
  const reputations = useQuery(api.world.getReputations);
  const relationships = useQuery(api.world.getRelationships);

  const agentReputation = reputations?.find((r) => r.agentId === agent._id);

  const relationshipSummary = useMemo(() => {
    if (!relationships) return [];
    return relationships
      .filter((r) => r.agentId === agent._id)
      .sort((a, b) => (b.trust + b.affinity) - (a.trust + a.affinity))
      .slice(0, 5);
  }, [relationships, agent._id]);

  const mood = describeMood(agent.emotion.valence, agent.emotion.arousal);
  const archetype = deriveArchetype(agent);

  const agentDoc = agent as AgentDoc & { interests?: string[]; habits?: string[]; longTermGoal?: string };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <AgentAvatar spriteSeed={agent.spriteSeed} size={32} className="shrink-0" />
          <div>
            <h3 className="text-base font-semibold text-neutral-900">{agent.name}</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-500">{STATUS_LABEL[agent.status] ?? agent.status}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500">{archetype}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-sm cursor-pointer p-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed">{agent.backstory}</p>

      {agentDoc.longTermGoal && (
        <div className="px-3 py-2 bg-emerald-50 rounded-lg text-xs text-emerald-700 border border-emerald-100">
          Ambition: {agentDoc.longTermGoal}
        </div>
      )}

      {agent.currentPlan && (
        <div className="px-3 py-2 bg-neutral-50 rounded-lg text-xs text-neutral-600 border border-neutral-100">
          {agent.currentPlan}
        </div>
      )}

      {/* Vitals */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <span className="text-[10px] text-neutral-400">Energy</span>
          <div className="h-1.5 bg-neutral-100 rounded-full mt-1">
            <div
              className="h-full bg-neutral-800 rounded-full transition-all"
              style={{ width: `${Math.round(agent.energy)}%` }}
            />
          </div>
          <span className="text-[10px] text-neutral-400 tabular-nums">{Math.round(agent.energy)}%</span>
        </div>
        <div>
          <span className="text-[10px] text-neutral-400">Mood</span>
          <div className="h-1.5 bg-neutral-100 rounded-full mt-1">
            <div
              className={`h-full rounded-full transition-all ${agent.emotion.valence > 0.2 ? "bg-emerald-500" : agent.emotion.valence < -0.2 ? "bg-red-400" : "bg-neutral-400"}`}
              style={{ width: `${Math.round(((agent.emotion.valence + 1) / 2) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-neutral-400">{mood}</span>
        </div>
        <div>
          <span className="text-[10px] text-neutral-400">Rep</span>
          <div className="text-sm font-semibold text-neutral-700 mt-0.5">
            {agentReputation ? agentReputation.score.toFixed(1) : "—"}
          </div>
        </div>
      </div>

      {/* Beliefs */}
      {beliefs && beliefs.length > 0 && (
        <Section title="Beliefs & Values">
          <div className="flex flex-col gap-1">
            {beliefs.map((b) => (
              <div key={b._id} className="flex items-start gap-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${BELIEF_CATEGORY_STYLE[b.category] ?? "bg-neutral-100 text-neutral-500"}`}>
                  {b.category}
                </span>
                <span className="text-[11px] text-neutral-600 leading-relaxed">{b.content}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Interests & Habits */}
      {((agentDoc.interests && agentDoc.interests.length > 0) || (agentDoc.habits && agentDoc.habits.length > 0)) && (
        <Section title="Inner Life">
          {agentDoc.interests && agentDoc.interests.length > 0 && (
            <div className="mb-1.5">
              <span className="text-[10px] text-neutral-400 mr-1">Interests:</span>
              <span className="text-[11px] text-neutral-600">{agentDoc.interests.join(", ")}</span>
            </div>
          )}
          {agentDoc.habits && agentDoc.habits.length > 0 && (
            <div>
              <span className="text-[10px] text-neutral-400 mr-1">Habits:</span>
              <span className="text-[11px] text-neutral-600">{agentDoc.habits.join("; ")}</span>
            </div>
          )}
        </Section>
      )}

      {/* Relationships */}
      {relationshipSummary.length > 0 && (
        <Section title="Relationships">
          <div className="flex flex-col gap-1">
            {relationshipSummary.map((r) => {
              const strength = r.trust + r.affinity;
              const label = strength > 0.8 ? "Close" : strength > 0.3 ? "Friendly" : strength > 0 ? "Neutral" : "Tense";
              return (
                <div key={r._id} className="flex items-center gap-2 text-[11px]">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${strength > 0.5 ? "bg-emerald-500" : strength > 0 ? "bg-amber-400" : "bg-red-400"}`} />
                  <span className="text-neutral-600 flex-1">{r.targetAgentId}</span>
                  <span className="text-neutral-400">{label}</span>
                  <span className="text-neutral-300 tabular-nums text-[10px]">T:{r.trust.toFixed(1)} A:{r.affinity.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

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
            <Bar key={skill} label={skill.slice(0, 5)} value={level} max={10} accent />
          ))}
        </div>
      </Section>

      {inventory && inventory.length > 0 && (
        <Section title="Inventory">
          <div className="flex flex-wrap gap-1.5">
            {inventory.map((item) => (
              <span key={item._id} className="px-2 py-1 bg-neutral-100 rounded-md text-[11px] text-neutral-600">
                {Math.round(item.quantity)} {item.itemType}
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
                  <div key={`${conv._id}-${msg.tick}-${i}`}>
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
