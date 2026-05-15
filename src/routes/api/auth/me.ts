import { createFileRoute } from "@tanstack/react-router";
import { jsonOk } from "@/lib/azure.server";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return jsonOk({ user: null });
        // Decode our console.<base64email>.<ts> token shape — best-effort only.
        const parts = token.split(".");
        let email = "operator@console";
        try {
          if (parts.length >= 2) email = Buffer.from(parts[1], "base64url").toString("utf8");
        } catch { /* ignore */ }
        return jsonOk({
          user: { email, name: email.split("@")[0], role: "admin" },
        });
      },
    },
  },
});
