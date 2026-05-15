import { createFileRoute } from "@tanstack/react-router";
import { jsonOk, jsonErr } from "@/lib/azure.server";

interface SaveBody {
  publicConfig?: Record<string, string>;
  secrets?: Record<string, string>;
}

export const Route = createFileRoute("/api/integrations/config/save")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: SaveBody = {};
        try {
          body = (await request.json()) as SaveBody;
        } catch {
          return jsonErr(400, "JSON غير صالح");
        }
        const secretCount = body.secrets ? Object.keys(body.secrets).length : 0;
        const publicCount = body.publicConfig ? Object.keys(body.publicConfig).length : 0;

        // Storage of submitted secrets/config requires a real key vault binding.
        // Until that's wired in (Azure Key Vault / Lovable Cloud Secrets), this
        // endpoint acknowledges receipt without echoing values back.
        return jsonOk({
          ok: true,
          mode: "fallback",
          received: { publicCount, secretCount },
          message:
            "تم استلام البيانات. لتفعيل الحفظ الدائم لازم تضبط أسرار Azure في Lovable Cloud Secrets.",
        });
      },
    },
  },
});
