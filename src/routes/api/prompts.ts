import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/prompts")({
  server: {
    handlers: {
      GET: async () => jsonOk([]),
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try { body = (await request.json()) as Record<string, unknown>; } catch { /* tolerate */ }
        return jsonOk({
          id: `pr_${Date.now().toString(36)}`,
          ...body,
          version: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      },
    },
  },
});
