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
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2 mb-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-[11px] text-neutral-400">Ask {agentName} anything. They will respond in character.</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-xs px-3 py-2 rounded-xl max-w-[90%] ${
              msg.role === "user"
                ? "bg-neutral-900 text-white self-end"
                : "bg-neutral-100 text-neutral-700 self-start"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="text-[11px] text-neutral-400 animate-pulse self-start">
            {agentName} is thinking...
          </div>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Ask ${agentName}...`}
          className="flex-1 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 text-neutral-800 placeholder:text-neutral-400 transition-colors"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2 text-xs bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 rounded-lg text-white transition-colors cursor-pointer font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
}
