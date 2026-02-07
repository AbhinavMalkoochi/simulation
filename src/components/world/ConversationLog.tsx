import { agentColorHex } from "../../types";
import type { WorldEvent, AgentSpriteData } from "../../types";

interface ConversationLogProps {
  events: WorldEvent[];
  agents: AgentSpriteData[];
}

const MAX_MESSAGES = 10;

/** Parse "Speaker said to Target: "message"" pattern from conversation events */
function parseConversation(description: string): { speaker: string; target: string; message: string } | null {
  const match = description.match(/^(.+?) said to (.+?): "(.+)"$/);
  if (!match) return null;
  return { speaker: match[1], target: match[2], message: match[3] };
}

export function ConversationLog({ events, agents }: ConversationLogProps) {
  const agentMap = new Map(agents.map((a) => [a.name, a]));

  const conversations = events
    .filter((e) => e.type === "conversation")
    .slice(0, MAX_MESSAGES)
    .map((e) => ({ ...parseConversation(e.description), _id: e._id, tick: e.tick }))
    .filter((c): c is { speaker: string; target: string; message: string; _id: string; tick: number } =>
      c.speaker !== null,
    )
    .reverse(); // oldest first for chat-like reading

  if (conversations.length === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 z-10 w-[300px] max-h-[35vh] flex flex-col bg-white/85 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/10 border border-white/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2 shrink-0">
        <span className="text-lg leading-none">💬</span>
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Conversations</span>
      </div>

      {/* Divider */}
      <div className="h-px bg-neutral-200/50 mx-3" />

      {/* Messages */}
      <div className="overflow-y-auto flex-1 py-2 px-3 flex flex-col gap-1.5">
        {conversations.map((msg) => {
          const speakerAgent = agentMap.get(msg.speaker);
          const speakerColor = speakerAgent ? agentColorHex(speakerAgent.spriteSeed) : "#6b7280";

          return (
            <div key={msg._id} className="flex items-start gap-2">
              <div
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: speakerColor }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold text-neutral-800">{msg.speaker}</span>
                <span className="text-[10px] text-neutral-400 ml-1">→ {msg.target}</span>
                <p className="text-[12px] text-neutral-700 leading-relaxed mt-0.5">
                  {msg.message.length > 120 ? msg.message.slice(0, 117) + "…" : msg.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
