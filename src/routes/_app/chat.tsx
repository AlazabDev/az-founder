import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, Copy, Loader2, RefreshCw, Send, Trash2, User } from "lucide-react";

import { PageHeader } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { BRANDS, DEFAULT_BRAND } from "@/lib/config";

export const Route = createFileRoute("/_app/chat")({
  component: ChatPage,
});

interface ChatRequest {
  message: string;
  conversationId: string | null;
  model: string;
  brand: string;
  systemPromptId: string | null;
  knowledgeSourceIds: string[];
  language: "ar" | "en";
}

interface ChatResponse {
  answer: string;
  conversationId: string;
  sources?: Array<{ title: string; url: string; score: number }>;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
  usage?: ChatResponse["usage"];
}

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [model, setModel] = useState("gpt-4o-mini");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const sendMutation = useMutation({
    mutationFn: (req: ChatRequest) =>
      api<ChatResponse>("/api/ai/chat", { method: "POST", body: req }),
    onSuccess: (res) => {
      setConversationId(res.conversationId);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          usage: res.usage,
        },
      ]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "فشل الإرسال"),
  });

  function send() {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    sendMutation.mutate({
      message: text,
      conversationId,
      model,
      brand,
      systemPromptId: null,
      knowledgeSourceIds: [],
      language: "ar",
    });
  }

  function reset() {
    setMessages([]);
    setConversationId(null);
  }

  return (
    <div>
      <PageHeader
        title="مساحة المحادثة الذكية"
        description="تحدّث مع البيانات بعد فهرستها. يستخدم الباك اند Azure OpenAI و Azure AI Search لاسترجاع السياق."
        actions={
          <Button variant="outline" size="sm" onClick={reset}>
            <Trash2 className="ml-2 h-4 w-4" /> محادثة جديدة
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="flex h-[70vh] flex-col rounded-lg border bg-card">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                ابدأ بإرسال رسالة للتحدث مع البيانات المفهرسة.
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      m.role === "user" ? "bg-primary/15 text-primary" : "bg-muted"
                    }`}
                  >
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="rounded-lg border bg-background p-3 text-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">المصادر</div>
                        <ul className="space-y-1 text-xs">
                          {m.sources.map((s, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate text-primary hover:underline"
                              >
                                {s.title}
                              </a>
                              <span className="num text-muted-foreground">
                                {(s.score * 100).toFixed(0)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.role === "assistant" && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            toast.success("تم النسخ");
                          }}
                        >
                          <Copy className="ml-1 h-3.5 w-3.5" /> نسخ
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {sendMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> يُحضِّر الإجابة…
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
                placeholder="اكتب سؤالك… (Ctrl/Cmd + Enter للإرسال)"
                rows={2}
                className="resize-none"
              />
              <Button onClick={send} disabled={sendMutation.isPending} className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-lg border bg-card p-4">
          <div>
            <Label className="text-xs">العلامة التجارية</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BRANDS.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">النموذج</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                <SelectItem value="gpt-4.1">gpt-4.1</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
            <div className="mb-1 font-medium text-foreground">معرّف المحادثة</div>
            <div className="num truncate">{conversationId ?? "—"}</div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={reset}>
            <RefreshCw className="ml-2 h-4 w-4" /> إعادة ضبط
          </Button>
        </aside>
      </div>
    </div>
  );
}
