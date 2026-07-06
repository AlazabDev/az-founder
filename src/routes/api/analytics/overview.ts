import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import { jsonOk } from "@/lib/azure.server";
import { buildOverviewPayload } from "../dashboard/overview";

export const Route = createFileRoute("/api/analytics/overview")({
  server: {
    middleware: [requireApiAuth], handlers: { GET: async () => jsonOk(buildOverviewPayload()) } },
});
