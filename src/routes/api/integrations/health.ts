import { createFileRoute } from "@tanstack/react-router";
import { requireApiAdmin } from "@/lib/api-auth.server";
import { buildIntegrationStatus, currentMode, jsonOk, nowIso } from "@/lib/azure.server";

export const Route = createFileRoute("/api/integrations/health")({
  server: {
    middleware: [requireApiAdmin],
    handlers: {
      GET: async () =>
        jsonOk({
          mode: currentMode(),
          checkedAt: nowIso(),
          services: buildIntegrationStatus(),
        }),
    },
  },
});
