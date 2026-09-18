import { NextResponse } from "next/server";
import { jsonError, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { TaskStatus, TaskWithMeta } from "@/types/crm.types";

type Params = { params: Promise<{ id: string }> };

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

async function loadTask(id: string) {
  const db = getTurso();
  const result = await db.execute({
    sql: `select t.*, u.name as assignee_name, coalesce(c.name, lc.name) as client_name, l.status as lead_status
          from tasks t
          join users u on u.id = t.assigned_to
          left join clients c on c.id = t.client_id
          left join leads l on l.id = t.lead_id
          left join clients lc on lc.id = l.client_id
          where t.id = ? limit 1`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? mapTask(row as Record<string, unknown>) : null;
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = await parseJson<{
    status?: TaskStatus;
    due_date?: string | null;
    title?: string;
  }>(request);

  if (!body) return jsonError("Invalid body", 400);

  await ensureSchema();
  const task = await loadTask(id);
  if (!task) return jsonError("Not found", 404);

  if (user.role !== "admin" && task.assigned_to !== user.id) {
    return jsonError("Forbidden", 403);
  }

  const status = body.status ?? task.status;
  if (status !== "pending" && status !== "done") {
    return jsonError("Invalid status", 400);
  }

  const title = body.title?.trim() ?? task.title;
  const dueDate = body.due_date !== undefined ? body.due_date : task.due_date;

  const db = getTurso();
  await db.execute({
    sql: `update tasks set status = ?, title = ?, due_date = ? where id = ?`,
    args: [status, title, dueDate, id],
  });

  const updated = await loadTask(id);
  return NextResponse.json(updated);
}
