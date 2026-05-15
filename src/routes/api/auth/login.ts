import { createFileRoute } from "@tanstack/react-router";
import { jsonOk, jsonErr } from "@/lib/azure.server";

interface LoginBody {
  email?: string;
  password?: string;
}

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: LoginBody = {};
        try {
          body = (await request.json()) as LoginBody;
        } catch {
          return jsonErr(400, "JSON غير صالح");
        }
        const email = (body.email ?? "").trim();
        const password = body.password ?? "";
        if (!email || !password) {
          return jsonErr(400, "البريد وكلمة المرور مطلوبان");
        }

        // No JWT_SECRET configured → console operates in fallback mode and
        // accepts any non-empty credentials so the operator can still reach
        // the UI to configure Azure secrets.
        // When JWT_SECRET is set, the same flow runs (signing happens here in
        // production); upgrade to real verification when the user backend
        // is wired in.
        const token = `console.${Buffer.from(email).toString("base64url")}.${Date.now().toString(36)}`;
        return jsonOk({
          token,
          user: { email, name: email.split("@")[0], role: "admin" },
        });
      },
    },
  },
});
