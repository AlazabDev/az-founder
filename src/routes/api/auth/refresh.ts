import { createFileRoute } from "@tanstack/react-router";
import { jsonOk, jsonErr } from "@/lib/azure.server";

export const Route = createFileRoute("/api/auth/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return jsonErr(401, "لا يوجد توكن");
        // Console-mode rotation — keep the same identity, refresh timestamp.
        const parts = token.split(".");
        const refreshed = `${parts[0] ?? "console"}.${parts[1] ?? ""}.${Date.now().toString(36)}`;
        return jsonOk({ token: refreshed });
      },
    },
  },
});
