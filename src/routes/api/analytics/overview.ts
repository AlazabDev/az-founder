import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";
import { buildOverviewPayload } from "../dashboard/overview";

export const Route = createFileRoute("/api/analytics/overview")({
  server: { handlers: { GET: async () => jsonOk(buildOverviewPayload()) } },
});
