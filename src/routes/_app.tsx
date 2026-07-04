import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  PlugZap,
  HardDrive,
  FolderSearch,
  MessagesSquare,
  Library,
  Sparkles,
  Boxes,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  Cloud,
  Cpu,
} from "lucide-react";

import { isAuthenticated, clearSession, getUser, hydrateSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    await hydrateSession();
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { to: "/chat", label: "المحادثة الذكية", icon: MessagesSquare },
  { to: "/ai-gateway", label: "AI Gateway", icon: Cpu },
  { to: "/storage", label: "المخازن السحابية", icon: Cloud },
  { to: "/integrations", label: "الربط والمعرفات", icon: PlugZap },
  { to: "/data", label: "فحص وتنظيم البيانات", icon: FolderSearch },
  { to: "/gdrive", label: "Google Drive", icon: HardDrive },
  { to: "/knowledge", label: "قاعدة المعرفة", icon: Library },
  { to: "/prompts", label: "استوديو البرومبت", icon: Sparkles },
  { to: "/tools", label: "أدوات الذكاء الاصطناعي", icon: Boxes },
  { to: "/jobs", label: "مراقبة الوظائف", icon: Activity },
  { to: "/analytics", label: "التحليلات", icon: BarChart3 },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = getUser();

  async function handleLogout() {
    await clearSession();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">Alazab AI</div>
            <div className="text-[11px] text-muted-foreground">
              Operations Console
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === "/"
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                ].join(" ")}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Separator />
        <div className="p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">
            {user?.email ?? "مستخدم"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-6 backdrop-blur">
          <div className="md:hidden">
            <span className="text-sm font-bold">Alazab AI</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="status-dot status-dot--ok" />
            <span>الباك اند متصل</span>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
