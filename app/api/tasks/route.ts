import { NextResponse } from "next/server";
import { jsonError, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { TaskWithMeta } from "@/types/crm.types";

function mapTask(row: Record<string, unknown>): TaskWithMeta {
  return {
    id: String(row.id),
    lead_id: row.lead_id == null ? null : String(row.lead_id),
    client_id: row.client_id == null ? null : String(row.client_id),
    assigned_to: String(row.assigned_to),
    title: String(row.title),
    due_date: row.due_date == null ? null : String(row.due_date),
    status: row.status as TaskWithMeta["status"],
    created_at: String(row.created_at),
    assignee_name: String(row.assignee_name ?? ""),
    client_name: row.client_name == null ? null : String(row.client_name),
    lead_status: row.lead_status == null ? null : (row.lead_status as TaskWithMeta["lead_status"]),
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  await ensureSchema();
  const db = getTurso();
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "mine";

  const args: string[] = [];
  let where = "where t.assigned_to = ?";
  args.push(user.id);

  if (scope === "all" && user.role === "admin") {
    where = "";
    args.length = 0;
  }

  const result = await db.execute({
    sql: `select t.*,
                 u.name as assignee_name,
                 coalesce(c.name, lc.name) as client_name,
                 l.status as lead_status
          from tasks t
          join users u on u.id = t.assigned_to
          left join clients c on c.id = t.client_id
          left join leads l on l.id = t.lead_id
          left join clients lc on lc.id = l.client_id
          ${where}
          order by
            case when t.status = 'pending' and t.due_date is not null then 0 else 1 end,
            t.due_date is null,
            t.due_date asc,
            t.created_at desc`,
    args,
  });

  return NextResponse.json(result.rows.map((row) => mapTask(row as Record<string, unknown>)));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await parseJson<{
    title?: string;
    assigned_to?: string;
    lead_id?: string | null;
    client_id?: string | null;
    due_date?: string | null;
  }>(request);

  const title = body?.title?.trim();
  if (!title) return jsonError("title is required", 400);

  let assignedTo = body?.assigned_to ?? user.id;
  if (user.role === "manager") {
    assignedTo = user.id;
  }

  await ensureSchema();
  const db = getTurso();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const leadId = body?.lead_id || null;
  const clientId = body?.client_id || null;
  const dueDate = body?.due_date || null;

  await db.execute({
    sql: `insert into tasks
          (id, lead_id, client_id, assigned_to, title, due_date, status, created_at)
          values (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    args: [id, leadId, clientId, assignedTo, title, dueDate, createdAt],
  });

  const created = await db.execute({
    sql: `select t.*, u.name as assignee_name, coalesce(c.name, lc.name) as client_name, l.status as lead_status
          from tasks t
          join users u on u.id = t.assigned_to
          left join clients c on c.id = t.client_id
          left join leads l on l.id = t.lead_id
          left join clients lc on lc.id = l.client_id
          where t.id = ?`,
    args: [id],
  });

  return NextResponse.json(
    mapTask(created.rows[0] as Record<string, unknown>),
    { status: 201 },
  );
}
