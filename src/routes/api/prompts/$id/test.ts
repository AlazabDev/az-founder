import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/prompts/$id/test")({
  server: { handlers: { POST: async ({ params }) => jsonOk({ ok: true, id: params.id }) } },
});
