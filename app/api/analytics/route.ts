import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import type {
  AnalyticsResponse,
  LeadSource,
  LeadStatus,
} from "@/types/crm.types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  await ensureSchema();
  const db = getTurso();

  const args: string[] = [];
  let filter = "";
  if (user.role === "manager") {
    filter = "where assigned_to = ?";
    args.push(user.id);
  }

  const leads = await db.execute({
    sql: `select id, status, source, assigned_to, created_at, updated_at
          from leads ${filter}`,
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

  const conversionRate =
    won + lost === 0 ? 0 : Math.round((won / (won + lost)) * 1000) / 10;

  const response: AnalyticsResponse = {
    totalLeads: rows.length,
    conversionRate,
    avgCloseDays:
      closeCount === 0
        ? null
        : Math.round((closeDaysSum / closeCount) * 10) / 10,
    leadsOverTime: [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
    statusBreakdown: [...statusMap.entries()].map(([status, count]) => ({
      status,
      count,
    })),
    sourceBreakdown: [...sourceMap.entries()].map(([source, count]) => ({
      source,
      count,
    })),
  };

  if (user.role === "admin") {
    const usersResult = await db.execute(
      `select id, name from users where is_active = 1`,
    );
    const performance = usersResult.rows.map((u) => {
      const userId = String(u.id);
      const userLeads = rows.filter((l) => l.assigned_to === userId);
      return {
        userId,
        userName: String(u.name),
        won: userLeads.filter((l) => l.status === "won").length,
        total: userLeads.length,
      };
    });
    response.teamPerformance = performance;
  }

  return NextResponse.json(response);
}
