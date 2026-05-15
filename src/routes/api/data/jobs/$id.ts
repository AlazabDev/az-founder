import { createFileRoute } from "@tanstack/react-router";
import { jsonErr } from "@/lib/azure.server";

export const Route = createFileRoute("/api/data/jobs/$id")({
  server: {
    handlers: {
      GET: async ({ params }) =>
        jsonErr(404, `لا يوجد job بالمعرّف ${params.id} — لم تُنفَّذ أي وظائف بعد.`),
    },
  },
});
