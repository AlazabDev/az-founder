import { createFileRoute } from "@tanstack/react-router";
import {
  buildIntegrationStatus,
  currentMode,
  jsonOk,
  nowIso,
} from "@/lib/azure.server";

/** Aggregated dashboard + analytics payload.
 *  Both /api/dashboard/overview and /api/analytics/overview use this shape so
 *  the frontend dashboard and analytics pages remain compatible. */
function buildOverview() {
  const mode = currentMode();
  const services = buildIntegrationStatus().map((s) => ({
    name: s.name,
    status:
      s.status === "connected"
        ? ("ok" as const)
        : s.status === "warning"
          ? ("warn" as const)
          : ("err" as const),
  }));
  return {
    mode,
    status: mode === "live" ? "ok" : "warning",
    generatedAt: nowIso(),
    // dashboard cards
    requestsToday: 0,
    filesUploaded: 0,
    filesAnalyzed: 0,
    imagesAnalyzed: 0,
    pdfsAnalyzed: 0,
    spreadsheetsAnalyzed: 0,
    activeJobs: 0,
    failedJobs: 0,
    knowledgeSources: 0,
    indexedDocuments: 0,
    organizationCompletion: 0,
    avgLatencyMs: 0,
    tokensUsed: 0,
    estimatedCostUsd: 0,
    recentActivity: [] as Array<{ id: string; title: string; at: string; type: string }>,
    recentErrors: [] as Array<{ id: string; message: string; at: string; service: string }>,
    servicesHealth: services,
    // analytics extras
    requestsTotal: 0,
    successRate: 0,
    failureRate: 0,
    topPrompts: [] as Array<{ name: string; count: number }>,
    topBrands: [] as Array<{ name: string; count: number }>,
    topSources: [] as Array<{ name: string; count: number }>,
    errorsByService: [] as Array<{ service: string; count: number }>,
  };
}

export const Route = createFileRoute("/api/dashboard/overview")({
  server: { handlers: { GET: async () => jsonOk(buildOverview()) } },
});

export const buildOverviewPayload = buildOverview;
