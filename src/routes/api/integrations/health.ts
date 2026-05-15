import { createFileRoute } from "@tanstack/react-router";
import { buildIntegrationStatus, currentMode, jsonOk, nowIso } from "@/lib/azure.server";

export const Route = createFileRoute("/api/integrations/health")({
  server: {
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
