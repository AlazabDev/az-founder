import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: { handlers: { POST: async () => jsonOk({ ok: true }) } },
});
