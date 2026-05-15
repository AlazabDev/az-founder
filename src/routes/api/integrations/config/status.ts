import { createFileRoute } from "@tanstack/react-router";
import { buildIntegrationStatus, jsonOk } from "@/lib/azure.server";

// Frontend expects a raw array (IntegrationStatus[]).
export const Route = createFileRoute("/api/integrations/config/status")({
  server: { handlers: { GET: async () => jsonOk(buildIntegrationStatus()) } },
});
