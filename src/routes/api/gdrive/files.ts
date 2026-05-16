import { createFileRoute } from "@tanstack/react-router";
import { jsonOk, jsonErr } from "@/lib/azure.server";
import { listFiles } from "@/lib/gdrive.server";

export const Route = createFileRoute("/api/gdrive/files")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") ?? undefined;
        const pageToken = url.searchParams.get("pageToken") ?? undefined;
        const pageSize = Number(url.searchParams.get("pageSize") ?? "50");
        try {
          const data = await listFiles({ q, pageToken, pageSize });
          return jsonOk({ mode: "live", ...data });
        } catch (e) {
          return jsonErr(502, (e as Error).message, { mode: "not_configured" });
        }
      },
    },
  },
});
