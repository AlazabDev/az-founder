import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/prompts/$id")({
  server: {
    handlers: {
      PUT: async ({ params, request }) => {
        let body: Record<string, unknown> = {};
        try { body = (await request.json()) as Record<string, unknown>; } catch { /* tolerate */ }
        return jsonOk({ id: params.id, ...body, updatedAt: new Date().toISOString() });
      },
      DELETE: async ({ params }) => jsonOk({ ok: true, id: params.id }),
    },
  },
});
