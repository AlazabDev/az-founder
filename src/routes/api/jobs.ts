import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/jobs")({
  server: { handlers: { GET: async () => jsonOk([]) } },
});
