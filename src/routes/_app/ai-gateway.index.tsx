import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  Shield,
  Timer,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { PageHeader, StatCard } from "@/components/console/PageHeader";
import { Button } from "@/components/ui/button";
import { getUsageOverview } from "@/lib/usage.functions";

export const Route = createFileRoute("/_app/ai-gateway/")({
  component: DashboardPage,
});

function DashboardPage() {
  const fetchOverview = useServerFn(getUsageOverview);
  const q = useQuery({ queryKey: ["ai-usage-overview"], queryFn: fetchOverview });
  const t = q.data?.totals;

  return (
    <div>
      <PageHeader
        title="AI Gateway"
        description="لوحة تحكم الاستخدام والتكلفة والحماية عبر Azure OpenAI + APIM."
        actions={
          <div className="flex gap-2">
            <Link to="/ai-gateway/endpoints">
              <Button size="sm" variant="outline">Endpoints</Button>
            </Link>
            <Link to="/ai-gateway/agents">
              <Button size="sm" variant="outline">Agents</Button>
            </Link>
            <Link to="/ai-gateway/policies">
              <Button size="sm" variant="outline">Policies</Button>
            </Link>
            <Link to="/ai-gateway/logs">
              <Button size="sm" variant="outline">Logs</Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="الطلبات (7ي)" value={t?.requests ?? 0} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="التوكنات" value={t?.totalTokens?.toLocaleString() ?? 0} icon={<Zap className="h-4 w-4" />} />
        <StatCard label="التكلفة $" value={`$${(t?.totalCost ?? 0).toFixed(4)}`} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="متوسط الاستجابة" value={`${t?.avgLatency ?? 0}ms`} icon={<Timer className="h-4 w-4" />} />
        <StatCard label="أخطاء" value={t?.errors ?? 0} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="محجوب (Safety)" value={t?.blocked ?? 0} icon={<Shield className="h-4 w-4" />} />
        <StatCard label="تجاوز حد المعدل" value={t?.rateLimited ?? 0} icon={<Shield className="h-4 w-4" />} />
      </div>

      <div className="mt-6 rounded-lg border bg-card p-4">
        <div className="mb-3 text-sm font-medium">الاستخدام اليومي</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={q.data?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tokens" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
