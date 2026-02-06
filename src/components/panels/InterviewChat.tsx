import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface Message {
  role: "user" | "agent";
  content: string;
}

export function InterviewChat({ agentId, agentName }: { agentId: Id<"agents">; agentName: string }) {
  const askAgent = useAction(api.interview.ask);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const response = await askAgent({ agentId, question });
      setMessages((prev) => [...prev, { role: "agent", content: response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "agent", content: "...I can't respond right now." }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight));
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-[10px] text-slate-500 mb-2">
        Interview with <span className="text-slate-300 font-medium">{agentName}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2 mb-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-[10px] text-slate-600 italic">Ask {agentName} anything. They will respond in character.</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-xs px-2 py-1.5 rounded max-w-[90%] ${
              msg.role === "user"
                ? "bg-emerald-900/30 text-emerald-200 self-end"
                : "bg-slate-800/60 text-slate-300 self-start"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-slate-500 italic animate-pulse self-start">
            {agentName} is thinking...
          </div>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Ask ${agentName}...`}
          className="flex-1 px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded focus:outline-none focus:border-emerald-600 text-slate-200 placeholder:text-slate-600"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 rounded text-white transition-colors cursor-pointer"
        >
          Send
        </button>
      </div>
    </div>
  );
}
