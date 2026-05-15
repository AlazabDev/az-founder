import { createFileRoute } from "@tanstack/react-router";
import { jsonErr } from "@/lib/azure.server";

export const Route = createFileRoute("/api/jobs/$id")({
  server: { handlers: { GET: async ({ params }) => jsonErr(404, `لا يوجد job ${params.id}`) } },
});
