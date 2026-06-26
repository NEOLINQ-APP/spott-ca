import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, Sparkles, MessageSquare, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSparqLearning,
  getSparqConversation,
} from "@/lib/sparq-learning.functions";

export const Route = createFileRoute("/admin/sparq-learning")({
  head: () => ({
    meta: [{ title: "Sparq Learning · Zeus" }],
  }),
  component: SparqLearningPage,
});

type Conversation = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  mode: string | null;
  title: string | null;
  message_count: number | null;
  last_message_at: string | null;
  created_at: string;
};

type MessagePart = { type: string; text?: string };
type ConversationMessage = {
  id: string;
  role: string;
  parts: MessagePart[] | null;
  created_at: string;
};

function SparqLearningPage() {
  const fetchOverview = useServerFn(getSparqLearning);
  const fetchConversation = useServerFn(getSparqConversation);

  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ conversations: 0, messages: 0 });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ConversationMessage[]>([]);
  const [activeLoading, setActiveLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchOverview()
      .then((res) => {
        if (!active) return;
        setTotals(res.totals);
        setConversations(res.conversations as Conversation[]);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [fetchOverview]);

  const openConversation = async (id: string) => {
    setActiveId(id);
    setActiveLoading(true);
    try {
      const res = await fetchConversation({ data: { conversationId: id } });
      setActiveMessages(res.messages as ConversationMessage[]);
    } finally {
      setActiveLoading(false);
    }
  };

  const uniqueUsers = new Set(
    conversations.map((c) => c.user_email ?? c.user_id ?? ""),
  ).size;

  return (
    <AdminShell
      title="Sparq Learning · Zeus"
      description="Every conversation Sparq has had with humans. This corpus trains Zeus over time."
    >
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.conversations.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages captured</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.messages.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unique humans (recent)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No conversations yet. Sparq will start learning as soon as visitors chat.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Msgs</TableHead>
                    <TableHead>Last</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversations.map((c) => (
                    <TableRow
                      key={c.id}
                      className={activeId === c.id ? "bg-muted/50" : ""}
                    >
                      <TableCell className="text-xs">
                        <div className="font-medium">{c.user_email ?? "—"}</div>
                        <div className="text-muted-foreground truncate max-w-[180px]">
                          {c.user_id}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{c.mode ?? "—"}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {c.title ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {c.message_count ?? 0}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.last_message_at
                          ? new Date(c.last_message_at).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConversation(c.id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {activeId ? "Transcript" : "Select a conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {activeLoading && (
              <div className="text-sm text-muted-foreground flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading transcript…
              </div>
            )}
            {!activeId && (
              <p className="text-sm text-muted-foreground">
                Pick any conversation on the left to read what Sparq learned from that human.
              </p>
            )}
            {activeId && !activeLoading && activeMessages.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages stored.</p>
            )}
            {activeMessages.map((m) => {
              const text =
                m.parts
                  ?.map((p) => (p.type === "text" ? p.text ?? "" : ""))
                  .join("") ?? "";
              return (
                <div
                  key={m.id}
                  className={`rounded-lg p-3 text-sm ${
                    m.role === "user"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    {m.role} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <div className="whitespace-pre-wrap">{text}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
