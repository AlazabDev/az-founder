import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { hydrateSession, isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    await hydrateSession();
    if (isAuthenticated()) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب — تحقق من بريدك للتفعيل");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "azure") {
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر تسجيل الدخول");
      setOauthLoading(null);
    }
  }

  async function handleResetPassword() {
    if (!email) return toast.error("أدخل بريدك أولاً");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("تم إرسال رابط استعادة كلمة المرور");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Alazab AI Console</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            غرفة تحكم تشغيلية لإدارة منصة الذكاء الاصطناعي
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4">
              <OAuthButtons onClick={handleOAuth} loading={oauthLoading} />
              <Divider />
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <OAuthButtons onClick={handleOAuth} loading={oauthLoading} />
              <Divider />
            </TabsContent>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسمك بالكامل"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">كلمة المرور</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="text-xs text-primary hover:underline"
                    >
                      نسيتها؟
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {mode === "signin" ? "دخول" : "إنشاء الحساب"}
              </Button>
            </form>
          </Tabs>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            المصادقة والأسرار مُدارة عبر Supabase. لا تُحفظ كلمة المرور في المتصفح.
          </p>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] uppercase text-muted-foreground">أو</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function OAuthButtons({
  onClick,
  loading,
}: {
  onClick: (p: "google" | "azure") => void;
  loading: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => onClick("google")}
        disabled={loading !== null}
      >
        {loading === "google" ? (
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="ml-2 h-4 w-4" />
        )}
        المتابعة عبر Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => onClick("azure")}
        disabled={loading !== null}
      >
        {loading === "azure" ? (
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="ml-2 h-4 w-4" />
        )}
        المتابعة عبر Microsoft
      </Button>
    </div>
  );
}
