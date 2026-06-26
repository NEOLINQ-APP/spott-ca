import { createFileRoute } from "@tanstack/react-router";
import { HaikuChat } from "@/haiku/HaikuChat";

export const Route = createFileRoute("/haiku/chat")({
  head: () => ({
    meta: [
      { title: "Chat with Haiku — Spott.ca" },
      { name: "description", content: "Chat with Haiku, your AI assistant for Spott.ca." },
    ],
  }),
  component: HaikuChatPage,
});

function HaikuChatPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Haiku</h1>
        <p className="text-sm text-muted-foreground">Your Spott.ca AI assistant.</p>
      </div>
      <HaikuChat variant="page" />
    </div>
  );
}
