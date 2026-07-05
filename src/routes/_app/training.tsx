/**
 * Training chat — pick an agent, inject a custom system prompt,
 * chat with the model to fine-tune prompts & test behavior.
 * Uses the existing /api/chat SSE endpoint (no persistence).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, GraduationCap, Loader2, Send, Trash2, User } from "lucide-react";

import { PageHeader } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getToken } from "@/lib/auth";
import { listAgents } from "@/lib/agents.functions";
import { listEndpoints } from "@/lib/endpoints.functions";

export const Route = createFileRoute("/_app/training")({
  component: TrainingPage,
});

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function TrainingPage() {
  const fetchAgents = useServerFn(listAgents);
  const fetchEndpoints = useServerFn(listEndpoints);

  const agents = useQuery({ queryKey: ["agents-training"], queryFn: fetchAgents });
  const eps = useQuery({ queryKey: ["endpoints-training"], queryFn: fetchEndpoints });

  const [agentId, setAgentId] = useState<string>("");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const agent = (agents.data ?? []).find((a) => a.id === agentId);
  const endpointId = agent?.endpoint_id ?? "";
  const endpoint = (eps.data ?? []).find((e) => e.id === endpointId);

  // Preload agent's system prompt when picked
  useEffect(() => {
    if (agent?.system_prompt !== undefined && agent.system_prompt !== null) {
      setSystemPrompt(agent.system_prompt);
    }
  }, [agent?.id, agent?.system_prompt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    if (!agentId) {
      toast.error("اختر وكيلاً أولاً");
      return;
    }
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setStreamText("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = getToken();
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          endpointId: endpointId || null,
          systemPrompt: systemPrompt || null,
          conversationId: null,
        }),
      });

      if (!resp.ok || !resp.body) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const p of parts) {
          const line = p.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json) as { delta?: string; done?: boolean; error?: string };
            if (evt.error) throw new Error(evt.error);
            if (evt.delta) {
              acc += evt.delta;
              setStreamText(acc);
            }
          } catch {
            /* ignore malformed line */
          }
        }
      }

      setMessages((m) => [...m, { role: "assistant", content: acc }]);
      setStreamText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function reset() {
    setMessages([]);
    setStreamText("");
    abortRef.current?.abort();
  }

  return (
    <div>
      <PageHeader
        title="بيئة التدريب"
        description="اختبر وكلاءك ودرّب البرومبتات مباشرة مع نماذج Azure OpenAI."
        actions={
          <Button variant="outline" onClick={reset} disabled={streaming}>
            <Trash2 className="ml-2 h-4 w-4" />
            مسح المحادثة
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Configuration panel */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <GraduationCap className="h-4 w-4 text-primary" />
              إعدادات الجلسة
            </div>

            <label className="mb-1 mt-3 block text-xs text-muted-foreground">الوكيل</label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر وكيلاً" />
              </SelectTrigger>
              <SelectContent>
                {(agents.data ?? []).filter((a) => a.enabled).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.model ? `· ${a.model}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {agent && (
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{agent.kind}</Badge>
                  {agent.version && <span>v{agent.version}</span>}
                </div>
                {endpoint && (
                  <div>
                    Endpoint: <span className="font-mono">{endpoint.name}</span>
                  </div>
                )}
              </div>
            )}

            <label className="mb-1 mt-4 block text-xs text-muted-foreground">
              System Prompt (تدريب مباشر)
            </label>
            <Textarea
              rows={8}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="أنت مساعد خبير في..."
              className="font-mono text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              التعديلات هنا مؤقتة للجلسة. احفظها في صفحة Agents لتصبح دائمة.
            </p>
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex h-[calc(100vh-14rem)] flex-col rounded-lg border bg-card">
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 && !streamText ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <GraduationCap className="mb-2 h-8 w-8" />
                ابدأ محادثة تدريبية لاختبار الوكيل والبرومبت.
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <Bubble key={i} role={m.role} content={m.content} />
                ))}
                {streamText && <Bubble role="assistant" content={streamText} streaming />}
                <div ref={endRef} />
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="اكتب رسالة تدريبية..."
                rows={2}
                disabled={streaming}
              />
              <Button onClick={() => void send()} disabled={streaming || !input.trim()}>
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  role, content, streaming,
}: { role: "user" | "assistant"; content: string; streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {content}
        {streaming && <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-current" />}
      </div>
    </div>
  );
}
