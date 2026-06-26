import { createFileRoute, useParams } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/sparq/widget/$slug")({
  head: () => ({
    meta: [
      { title: "Sparq Widget" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Widget,
});

type Config = { assistant_name: string; brand_color: string; greeting: string; business_name: string };

function Widget() {
  const { slug } = useParams({ from: "/sparq/widget/$slug" });
  const [config, setConfig] = useState<Config | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: `/api/public/sparq/chat/${slug}` }),
  });

  useEffect(() => {
    fetch(`/api/public/sparq/config/${slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setConfig)
      .catch(() => setConfig({ assistant_name: "Sparq", brand_color: "#3B82F6", greeting: "Hi! How can I help?", business_name: "" }));
  }, [slug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const color = config?.brand_color || "#3B82F6";

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="px-4 py-3 border-b flex items-center gap-2" style={{ background: color, color: "white" }}>
        <Sparkles className="h-5 w-5" />
        <div>
          <div className="font-semibold text-sm leading-tight">{config?.assistant_name ?? "Sparq"}</div>
          {config?.business_name && <div className="text-xs opacity-80 leading-tight">{config.business_name}</div>}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && config && (
          <div className="text-sm bg-muted rounded-2xl px-4 py-3 max-w-[85%]">{config.greeting}</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "ml-auto text-white" : "bg-muted"}`}
            style={m.role === "user" ? { background: color } : undefined}>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {m.parts.map((p, i) => p.type === "text" ? <ReactMarkdown key={i}>{p.text}</ReactMarkdown> : null)}
            </div>
          </div>
        ))}
        {status === "streaming" && <div className="text-xs text-muted-foreground">Typing…</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="border-t p-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ outlineColor: color }}
        />
        <button type="submit" className="rounded-full p-2 text-white" style={{ background: color }} aria-label="Send">
          <Send className="h-4 w-4" />
        </button>
      </form>
      <div className="text-[10px] text-center text-muted-foreground py-1">
        Powered by <a href="https://spott.ca/sparq/business" target="_blank" rel="noopener" className="underline">Sparq</a>
      </div>
    </div>
  );
}
