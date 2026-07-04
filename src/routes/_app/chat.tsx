import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, Copy, Loader2, Plus, Send, Trash2, User } from "lucide-react";

import { PageHeader } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getToken } from "@/lib/auth";
import {
  listConversations,
  getConversation,
  deleteConversation,
} from "@/lib/conversations.functions";
import { listEndpoints } from "@/lib/endpoints.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/chat")({
  component: ChatPage,
});

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function ChatPage() {
  const qc = useQueryClient();
  const [convId, setConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [endpointId, setEndpointId] = useState<string | "auto">("auto");
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchList = useServerFn(listConversations);
  const fetchOne = useServerFn(getConversation);
  const removeConv = useServerFn(deleteConversation);
  const fetchEndpoints = useServerFn(listEndpoints);

  const convs = useQuery({ queryKey: ["conversations"], queryFn: fetchList });
  const eps = useQuery({ queryKey: ["endpoints-chat"], queryFn: fetchEndpoints });

  useEffect(() => {
    if (!convId) {
      setMessages([]);
      return;
    }
    fetchOne({ data: { id: convId } }).then((r) => {
      setMessages(
        (r.messages ?? []).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      );
    });
  }, [convId, fetchOne]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const del = useMutation({
    mutationFn: (id: string) => removeConv({ data: { id } }),
    onSuccess: () => {
      setConvId(null);
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setStreamText("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = getToken();
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          conversationId: convId,
          endpointId: endpointId === "auto" ? null : endpointId,
        }),
        signal: controller.signal,
      });

      if (!r.ok) {
        const err = await r.text();
        toast.error(err || `فشل الإرسال (${r.status})`);
        setStreaming(false);
        return;
      }

      const reader = r.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload) as {
              delta?: string;
              done?: boolean;
              conversationId?: string;
              error?: string;
            };
            if (j.error) toast.error(j.error);
            if (j.delta) {
              acc += j.delta;
              setStreamText(acc);
            }
            if (j.done && j.conversationId) {
              setConvId(j.conversationId);
              qc.invalidateQueries({ queryKey: ["conversations"] });
            }
          } catch {
            // ignore
          }
        }
      }

      setMessages((m) => [...m, { role: "assistant", content: acc }]);
      setStreamText("");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error(e instanceof Error ? e.message : "خطأ");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div>
      <PageHeader
        title="المحادثة الذكية"
        description="Streaming عبر AI Gateway مع Azure OpenAI + APIM + Content Safety."
        actions={
          <Button variant="outline" size="sm" onClick={() => setConvId(null)}>
            <Plus className="ml-2 h-4 w-4" /> محادثة جديدة
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border bg-card p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">المحادثات</div>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-1">
              {(convs.data ?? []).map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
                    convId === c.id ? "bg-accent" : ""
                  }`}
                >
                  <button
                    className="flex-1 truncate text-right"
                    onClick={() => setConvId(c.id)}
                  >
                    {c.title}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => del.mutate(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
              {convs.data?.length === 0 && (
                <div className="text-xs text-muted-foreground">لا توجد محادثات بعد.</div>
              )}
            </div>
          </ScrollArea>
        </aside>

        <div className="flex h-[70vh] flex-col rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-3">
            <Select value={endpointId} onValueChange={(v) => setEndpointId(v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="اختر endpoint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">تلقائي (الافتراضي)</SelectItem>
                {(eps.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — {e.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && !streamText ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                ابدأ محادثة جديدة…
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <MessageBubble key={i} role={m.role} content={m.content} />
                ))}
                {streamText && <MessageBubble role="assistant" content={streamText} streaming />}
              </>
            )}
            {streaming && !streamText && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> جاري التفكير…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="اكتب رسالتك… (Ctrl/Cmd + Enter للإرسال)"
                rows={2}
                className="resize-none"
              />
              <Button onClick={send} disabled={streaming} className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}) {
  return (
    <div className={`flex gap-3 ${role === "user" ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          role === "user" ? "bg-primary/15 text-primary" : "bg-muted"
        }`}
      >
        {role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="whitespace-pre-wrap rounded-lg border bg-background p-3 text-sm">
          {content}
          {streaming && <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-primary" />}
        </div>
        {role === "assistant" && !streaming && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 h-7"
            onClick={() => {
              navigator.clipboard.writeText(content);
              toast.success("نُسخ");
            }}
          >
            <Copy className="ml-1 h-3 w-3" /> نسخ
          </Button>
        )}
      </div>
    </div>
  );
}
