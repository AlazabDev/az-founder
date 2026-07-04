/**
 * Streaming chat endpoint. Uses Azure OpenAI directly with our policy layer.
 * Client posts { conversationId, message, endpointId? }. Response is SSE:
 *   data: {"delta":"..."}
 *   data: {"done":true, "conversationId":"..."}
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  preflight,
  callAzureStream,
  logUsage,
  incrementRateLimit,
  computeCost,
  cbFail,
  cbSuccess,
  type ChatMsg,
} from "@/lib/ai-gateway.server";

function admin() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function authUser(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const db = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

interface Body {
  message: string;
  conversationId?: string | null;
  endpointId?: string | null;
  systemPrompt?: string | null;
}

function sseEncode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await authUser(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as Body;
        if (!body?.message?.trim()) return new Response("message required", { status: 400 });

        const db = admin();

        // Ensure conversation
        let convId = body.conversationId ?? null;
        if (!convId) {
          const { data, error } = await db
            .from("ai_conversations")
            .insert({
              user_id: userId,
              title: body.message.slice(0, 60),
              system_prompt: body.systemPrompt ?? null,
            })
            .select("id")
            .single();
          if (error) return new Response(error.message, { status: 500 });
          convId = data.id;
        }

        // Save user message
        await db.from("ai_messages").insert({
          conversation_id: convId,
          user_id: userId,
          role: "user",
          content: body.message,
        });

        // Preflight
        const pre = await preflight(userId, body.endpointId ?? null, body.message);
        if (!pre.ok) {
          await logUsage({
            user_id: userId,
            endpoint_id: pre.endpoint.id.startsWith("env-") ? null : pre.endpoint.id,
            conversation_id: convId,
            model: pre.endpoint.model,
            prompt_tokens: 0,
            completion_tokens: 0,
            total_cost_usd: 0,
            latency_ms: 0,
            status: pre.status === 429 ? "rate_limited" : "blocked",
            error: pre.error,
          });
          return new Response(pre.error ?? "blocked", { status: pre.status ?? 400 });
        }

        // Load prior messages for context (last 20)
        const { data: prior } = await db
          .from("ai_messages")
          .select("role, content")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true })
          .limit(20);

        const messages: ChatMsg[] = [];
        const sys = body.systemPrompt ?? "أنت مساعد ذكي وموجز يجيب بالعربية عند السؤال بها.";
        messages.push({ role: "system", content: sys });
        for (const m of prior ?? []) {
          if (m.role === "system" || m.role === "user" || m.role === "assistant") {
            messages.push({ role: m.role, content: m.content });
          }
        }

        // Call upstream
        const started = Date.now();
        let upstream: Response;
        try {
          upstream = await callAzureStream(pre.endpoint, messages);
        } catch (e) {
          cbFail(pre.endpoint.id);
          const err = e instanceof Error ? e.message : String(e);
          await logUsage({
            user_id: userId, endpoint_id: pre.endpoint.id.startsWith("env-") ? null : pre.endpoint.id,
            conversation_id: convId, model: pre.endpoint.model,
            prompt_tokens: 0, completion_tokens: 0, total_cost_usd: 0,
            latency_ms: Date.now() - started, status: "error", error: err,
          });
          return new Response(`Upstream error: ${err}`, { status: 502 });
        }

        if (!upstream.ok || !upstream.body) {
          cbFail(pre.endpoint.id);
          const text = await upstream.text().catch(() => "");
          await logUsage({
            user_id: userId, endpoint_id: pre.endpoint.id.startsWith("env-") ? null : pre.endpoint.id,
            conversation_id: convId, model: pre.endpoint.model,
            prompt_tokens: 0, completion_tokens: 0, total_cost_usd: 0,
            latency_ms: Date.now() - started, status: "error",
            error: `HTTP ${upstream.status}: ${text.slice(0, 300)}`,
          });
          return new Response(text || `Upstream ${upstream.status}`, { status: upstream.status });
        }

        const requestId = upstream.headers.get("x-request-id") ?? upstream.headers.get("apim-request-id");

        // Stream transform: parse OpenAI SSE, emit our own SSE
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let assistantText = "";
        let usage = { prompt: 0, completion: 0 };
        const capturedConvId = convId;

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            let buf = "";
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                  const t = line.trim();
                  if (!t.startsWith("data:")) continue;
                  const payload = t.slice(5).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    const j = JSON.parse(payload) as {
                      choices?: Array<{ delta?: { content?: string } }>;
                      usage?: { prompt_tokens?: number; completion_tokens?: number };
                    };
                    const delta = j.choices?.[0]?.delta?.content;
                    if (delta) {
                      assistantText += delta;
                      controller.enqueue(sseEncode({ delta }));
                    }
                    if (j.usage) {
                      usage.prompt = j.usage.prompt_tokens ?? usage.prompt;
                      usage.completion = j.usage.completion_tokens ?? usage.completion;
                    }
                  } catch {
                    // ignore parse
                  }
                }
              }

              const cost = await computeCost(pre.endpoint.model, usage.prompt, usage.completion);
              // Persist assistant message
              if (assistantText) {
                await db.from("ai_messages").insert({
                  conversation_id: capturedConvId,
                  user_id: userId,
                  role: "assistant",
                  content: assistantText,
                  metadata: { usage, model: pre.endpoint.model, request_id: requestId },
                });
              }
              await logUsage({
                user_id: userId,
                endpoint_id: pre.endpoint.id.startsWith("env-") ? null : pre.endpoint.id,
                conversation_id: capturedConvId,
                model: pre.endpoint.model,
                prompt_tokens: usage.prompt,
                completion_tokens: usage.completion,
                total_cost_usd: cost,
                latency_ms: Date.now() - started,
                status: "success",
                request_id: requestId,
              });
              await incrementRateLimit(userId, pre.endpoint.id, usage.prompt + usage.completion);
              cbSuccess(pre.endpoint.id);
              controller.enqueue(
                sseEncode({
                  done: true,
                  conversationId: capturedConvId,
                  usage: { ...usage, cost_usd: cost },
                }),
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch (e) {
              cbFail(pre.endpoint.id);
              controller.enqueue(
                sseEncode({ error: e instanceof Error ? e.message : "stream error" }),
              );
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
