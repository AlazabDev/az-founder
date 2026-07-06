import { createFileRoute } from "@tanstack/react-router";
import { requireApiAdmin } from "@/lib/api-auth.server";
import { buildIntegrationStatus, jsonOk } from "@/lib/azure.server";

// Frontend expects a raw array (IntegrationStatus[]).
export const Route = createFileRoute("/api/integrations/config/status")({
  server: {
    middleware: [requireApiAdmin], handlers: { GET: async () => jsonOk(buildIntegrationStatus()) } },
});
