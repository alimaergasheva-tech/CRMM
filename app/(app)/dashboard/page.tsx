import { TopBar } from "@/components/layout/TopBar";
import { LeadsOverTimeChart } from "@/components/charts/LeadsOverTimeChart";
import { StatusBreakdownChart } from "@/components/charts/StatusBreakdownChart";
import { SourceBreakdownChart } from "@/components/charts/SourceBreakdownChart";
import { TeamPerformanceChart } from "@/components/charts/TeamPerformanceChart";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { AnalyticsResponse, LeadSource, LeadStatus } from "@/types/crm.types";
import { redirect } from "next/navigation";

async function loadAnalytics(userId: string, role: string): Promise<AnalyticsResponse> {
  await ensureSchema();
  const db = getTurso();
  const args: string[] = [];
  let filter = "";
  if (role === "manager") {
    filter = "where assigned_to = ?";
    args.push(userId);
  }

  const leads = await db.execute({
    sql: `select id, status, source, assigned_to, created_at, updated_at from leads ${filter}`,
    args,
  });

  const rows = leads.rows.map((row) => ({
    id: String(row.id),
    status: row.status as LeadStatus,
    source: row.source as LeadSource,
    assigned_to: row.assigned_to == null ? null : String(row.assigned_to),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));

  const statusMap = new Map<LeadStatus, number>();
  const sourceMap = new Map<LeadSource, number>();
  const byDate = new Map<string, number>();
  let won = 0;
  let lost = 0;
  let closeDaysSum = 0;
  let closeCount = 0;

  for (const lead of rows) {
    statusMap.set(lead.status, (statusMap.get(lead.status) ?? 0) + 1);
    sourceMap.set(lead.source, (sourceMap.get(lead.source) ?? 0) + 1);
    const day = lead.created_at.slice(0, 10);
    byDate.set(day, (byDate.get(day) ?? 0) + 1);
    if (lead.status === "won") won += 1;
    if (lead.status === "lost") lost += 1;
    if (lead.status === "won" || lead.status === "lost") {
      const start = Date.parse(lead.created_at);
      const end = Date.parse(lead.updated_at);
      if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
        closeDaysSum += (end - start) / (1000 * 60 * 60 * 24);
        closeCount += 1;
      }
    }
  }

  const response: AnalyticsResponse = {
    totalLeads: rows.length,
    conversionRate: won + lost === 0 ? 0 : Math.round((won / (won + lost)) * 1000) / 10,
    avgCloseDays: closeCount === 0 ? null : Math.round((closeDaysSum / closeCount) * 10) / 10,
    leadsOverTime: [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
    statusBreakdown: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
    sourceBreakdown: [...sourceMap.entries()].map(([source, count]) => ({ source, count })),
  };

  if (role === "admin") {
    const usersResult = await db.execute(`select id, name from users where is_active = 1`);
    response.teamPerformance = usersResult.rows.map((u) => {
      const id = String(u.id);
      const userLeads = rows.filter((l) => l.assigned_to === id);
      return {
        userId: id,
        userName: String(u.name),
        won: userLeads.filter((l) => l.status === "won").length,
        total: userLeads.length,
      };
    });
  }

  return response;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const analytics = await loadAnalytics(user.id, user.role);

  return (
    <div>
      <TopBar title="Дашборд" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Заявок" value={String(analytics.totalLeads)} />
        <Metric label="Конверсия" value={`${analytics.conversionRate}%`} />
        <Metric
          label="Среднее закрытие"
          value={analytics.avgCloseDays == null ? "—" : `${analytics.avgCloseDays} дн.`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Заявки по времени">
          <LeadsOverTimeChart data={analytics.leadsOverTime} />
        </Panel>
        <Panel title="Статусы">
          <StatusBreakdownChart data={analytics.statusBreakdown} />
        </Panel>
        <Panel title="Источники">
          <SourceBreakdownChart data={analytics.sourceBreakdown} />
        </Panel>
        {analytics.teamPerformance ? (
          <Panel title="Команда">
            <TeamPerformanceChart data={analytics.teamPerformance} />
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        {value}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="mb-4 text-sm font-semibold text-[var(--ink)]">{title}</h2>
      {children}
    </section>
  );
}
