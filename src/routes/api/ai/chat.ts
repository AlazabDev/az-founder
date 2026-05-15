import { createFileRoute } from "@tanstack/react-router";
import { currentMode, jsonOk, jsonErr, readAzureConfig } from "@/lib/azure.server";

interface ChatBody {
  message?: string;
  conversationId?: string | null;
  model?: string;
  brand?: string;
  systemPromptId?: string | null;
  knowledgeSourceIds?: string[];
  language?: "ar" | "en";
}

async function callAzureOpenAI(prompt: string, model: string): Promise<string> {
  const c = readAzureConfig();
  const endpoint = c.openaiEndpoint!.replace(/\/+$/, "");
  const deployment = c.openaiDeployment!;
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=2024-08-01-preview`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": c.openaiKey!,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Azure OpenAI ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatBody = {};
        try { body = (await request.json()) as ChatBody; } catch {
          return jsonErr(400, "JSON غير صالح");
        }
        const message = (body.message ?? "").trim();
        if (!message) return jsonErr(400, "الرسالة فارغة");

        const conversationId = body.conversationId ?? `conv_${Date.now().toString(36)}`;
        const mode = currentMode();

        if (mode !== "live") {
          return jsonOk({
            mode: "not_configured",
            answer:
              "الباك اند لم يُربَط بـ Azure OpenAI بعد. أضف الأسرار التالية في Lovable Cloud Secrets ليبدأ المساعد بالردّ:\n\n" +
              "• AZURE_OPENAI_ENDPOINT\n• AZURE_OPENAI_API_KEY\n• AZURE_OPENAI_DEPLOYMENT\n• AZURE_AI_SEARCH_ENDPOINT\n• AZURE_AI_SEARCH_ADMIN_KEY\n• AZURE_AI_SEARCH_INDEX",
            conversationId,
            sources: [],
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          });
        }

        try {
          const answer = await callAzureOpenAI(message, body.model ?? "gpt-4o-mini");
          return jsonOk({
            mode: "live",
            answer,
            conversationId,
            sources: [],
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          });
        } catch (e) {
          return jsonOk({
            mode: "fallback",
            answer: `تعذّر الوصول إلى Azure OpenAI:\n${(e as Error).message}`,
            conversationId,
            sources: [],
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          });
        }
      },
    },
  },
});
