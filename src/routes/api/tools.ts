import { createFileRoute } from "@tanstack/react-router";
import { buildIntegrationStatus, jsonOk } from "@/lib/azure.server";

// Tools page expects: { id, name, description?, status: "ok"|"warn"|"err"|"idle", endpoint?, lastCheckedAt? }
export const Route = createFileRoute("/api/tools")({
  server: {
    handlers: {
      GET: async () => {
        const items = buildIntegrationStatus().map((s) => ({
          id: s.id,
          name: s.name,
          description: s.message,
          status:
            s.status === "connected"
              ? ("ok" as const)
              : s.status === "warning"
                ? ("warn" as const)
                : s.status === "disconnected"
                  ? ("err" as const)
                  : ("idle" as const),
          endpoint: undefined,
          lastCheckedAt: s.lastCheckedAt,
        }));
        return jsonOk(items);
      },
    },
  },
});
