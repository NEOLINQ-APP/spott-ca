import { createFileRoute } from "@tanstack/react-router";
import { SparqChat } from "@/sparq/SparqChat";

export const Route = createFileRoute("/sparq/chat")({
  head: () => ({
    meta: [
      { title: "Chat with Sparq — Spott.ca" },
      { name: "description", content: "Chat with Sparq, your AI assistant for Spott.ca." },
    ],
  }),
  component: SparqChatPage,
});

function SparqChatPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Sparq</h1>
        <p className="text-sm text-muted-foreground">Your Spott.ca AI assistant.</p>
      </div>
      <SparqChat variant="page" />
    </div>
  );
}
