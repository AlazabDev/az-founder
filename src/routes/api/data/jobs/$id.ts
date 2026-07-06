import { createFileRoute } from "@tanstack/react-router";
import { requireApiAuth } from "@/lib/api-auth.server";
import { jsonErr } from "@/lib/azure.server";

export const Route = createFileRoute("/api/data/jobs/$id")({
  server: {
    middleware: [requireApiAuth],
    handlers: {
      GET: async ({ params }) =>
        jsonErr(404, `لا يوجد job بالمعرّف ${params.id} — لم تُنفَّذ أي وظائف بعد.`),
    },
  },
});
