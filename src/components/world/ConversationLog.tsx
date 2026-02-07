import { useState, useEffect, useRef } from "react";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { agentColorHex } from "../../types";
import type { WorldEvent, AgentSpriteData } from "../../types";
import type { Id } from "../../../convex/_generated/dataModel";

interface ConversationLogProps {
  events: WorldEvent[];
  agents: AgentSpriteData[];
}

const MAX_MESSAGES = 10;

interface ParsedConversation {
  speaker: string;
  target: string;
  message: string;
  _id: Id<"worldEvents">;
  tick: number;
}

/** Parse "Speaker said to Target: "message"" pattern from conversation events */
function parseConversation(description: string): { speaker: string; target: string; message: string } | null {
  const match = description.match(/^(.+?) said to (.+?): "(.+)"$/);
  if (!match) return null;
  return { speaker: match[1], target: match[2], message: match[3] };
}

function MessageItem({ msg, speakerColor }: { msg: ParsedConversation; speakerColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = msg.message.length > 120;
  const displayMessage = expanded || !isLong ? msg.message : msg.message.slice(0, 117) + "…";

  return (
    <div className="flex items-start gap-2">
      <div
        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
        style={{ backgroundColor: speakerColor }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-semibold text-neutral-800">{msg.speaker}</span>
        <span className="text-[10px] text-neutral-400 ml-1">→ {msg.target}</span>
        <p className="text-[12px] text-neutral-700 leading-relaxed mt-0.5">
          {displayMessage}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-neutral-500 hover:text-neutral-700 mt-1 font-medium cursor-pointer"
          >
            {expanded ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
}

export function ConversationLog({ events, agents }: ConversationLogProps) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const agentMap = new Map(agents.map((a) => [a.name, a]));

  const conversations: ParsedConversation[] = events
    .filter((e) => e.type === "conversation")
    .slice(0, MAX_MESSAGES)
    .map((e) => {
      const parsed = parseConversation(e.description);
      if (!parsed) return null;
      return {
        speaker: parsed.speaker,
        target: parsed.target,
        message: parsed.message,
        _id: e._id,
        tick: e.tick,
      };
    })
    .filter((c): c is ParsedConversation => c !== null)
    .reverse();

  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversations, collapsed]);

  if (conversations.length === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 z-10 w-[300px] max-h-[35vh] flex flex-col bg-white/85 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/10 border border-white/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between gap-2 px-3.5 py-2 shrink-0 hover:bg-neutral-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-neutral-500" />
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Conversations</span>
        </div>
        {collapsed ? (
          <ChevronUp className="w-3 h-3 text-neutral-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-neutral-400" />
        )}
      </button>

      {!collapsed && (
        <>
          {/* Divider */}
          <div className="h-px bg-neutral-200/50 mx-3" />

          {/* Messages */}
          <div ref={scrollRef} className="overflow-y-auto flex-1 py-2 px-3 flex flex-col gap-1.5">
            {conversations.map((msg) => {
              const speakerAgent = agentMap.get(msg.speaker);
              const speakerColor = speakerAgent ? agentColorHex(speakerAgent.spriteSeed) : "#6b7280";
              return <MessageItem key={msg._id} msg={msg} speakerColor={speakerColor} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}
