import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import { currentMode, jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/knowledge/reindex")({
  server: {
    middleware: [requireApiAuth],
    handlers: {
      POST: async ({ request }) => {
        let body: unknown = {};
        try { body = await request.json(); } catch { /* tolerate */ }
        return jsonOk({ ok: true, mode: currentMode(), payload: body });
      },
    },
  },
});
