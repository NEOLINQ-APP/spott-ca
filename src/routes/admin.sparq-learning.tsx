// Admin transcript viewer for Sparq conversations.
// Wires the previously-unused getSparqLearning/getSparqConversation server
// functions (src/lib/sparq-learning.functions.ts) — real conversation data
// only appears here once sparq.chat.ts is logging turns (see logTurn()).
import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessagesSquare, Sparkles } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getSparqLearning, getSparqConversation } from "@/lib/sparq-learning.functions";

export const Route = createFileRoute("/admin/sparq-learning")({
  component: AdminSparqLearning,
  head: () => ({ meta: [{ title: "Sparq Learning — Spott Admin" }] }),
});

type ConversationRow = Awaited<ReturnType<typeof getSparqLearning>>["conversations"][number];
type Message = Awaited<ReturnType<typeof getSparqConversation>>["messages"][number];

function messageText(parts: unknown): string {
  if (parts && typeof parts === "object" && "text" in (parts as Record<string, unknown>)) {
    return String((parts as Record<string, unknown>).text ?? "");
  }
  return typeof parts === "string" ? parts : JSON.stringify(parts);
}

function AdminSparqLearning() {
  const fetchLearning = useServerFn(getSparqLearning);
  const fetchConversation = useServerFn(getSparqConversation);

  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [totals, setTotals] = useState({ conversations: 0, messages: 0 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    fetchLearning({})
      .then((res) => {
        setRows(res.conversations as ConversationRow[]);
        setTotals(res.totals);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    setMessagesLoading(true);
    try {
      const res = await fetchConversation({ data: { conversationId: id } });
      setMessages(res.messages as Message[]);
    } finally {
      setMessagesLoading(false);
    }
  }

  return (
    <AdminShell
      title="Sparq Learning"
      description="Recent conversations Sparq has had with users — for QA and prompt tuning."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/sparq">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Sparq settings
          </Link>
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-4 sm:w-fit sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Conversations</div>
            <div className="mt-1 text-2xl font-semibold">{totals.conversations.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Messages</div>
            <div className="mt-1 text-2xl font-semibold">{totals.messages.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <MessagesSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              No conversations logged yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <Fragment key={r.id}>
                    <TableRow>
                      <TableCell className="text-sm">{r.user_name ?? r.user_email ?? r.user_id.slice(0, 8)}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm">{r.title || "Untitled"}</TableCell>
                      <TableCell className="text-sm capitalize">{r.mode}</TableCell>
                      <TableCell className="text-right text-sm">{r.message_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.last_message_at ? new Date(r.last_message_at).toLocaleString("en-CA") : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => toggle(r.id)}>
                          {expanded === r.id ? "Hide" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded === r.id && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30">
                          {messagesLoading ? (
                            <div className="grid place-items-center p-6">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="max-h-96 space-y-2 overflow-auto p-3">
                              {messages.map((m) => (
                                <div
                                  key={m.id}
                                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                    m.role === "user"
                                      ? "ml-auto bg-primary/10"
                                      : "mr-auto bg-background border"
                                  }`}
                                >
                                  <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                    {m.role}
                                  </div>
                                  <div className="whitespace-pre-wrap">{messageText(m.parts)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
