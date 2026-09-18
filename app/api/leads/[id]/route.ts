import { NextResponse } from "next/server";
import { jsonError, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { LeadSource, LeadStatus, LeadWithClient, Task } from "@/types/crm.types";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/types/crm.types";

type Params = { params: Promise<{ id: string }> };

function mapLead(row: Record<string, unknown>): LeadWithClient {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    source: row.source as LeadWithClient["source"],
    status: row.status as LeadWithClient["status"],
    assigned_to: row.assigned_to == null ? null : String(row.assigned_to),
    value: row.value == null ? null : Number(row.value),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    client_name: String(row.client_name ?? ""),
    client_phone: String(row.client_phone ?? ""),
    assignee_name: row.assignee_name == null ? null : String(row.assignee_name),
  };
}

async function loadLead(id: string) {
  const db = getTurso();
  const result = await db.execute({
    sql: `select l.*, c.name as client_name, c.phone as client_phone, u.name as assignee_name
          from leads l
          join clients c on c.id = l.client_id
          left join users u on u.id = l.assigned_to
          where l.id = ? limit 1`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? mapLead(row as Record<string, unknown>) : null;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  await ensureSchema();
  const lead = await loadLead(id);
  if (!lead) return jsonError("Not found", 404);

  if (user.role === "manager" && lead.assigned_to !== user.id) {
    return jsonError("Forbidden", 403);
  }

  const db = getTurso();
  const tasksResult = await db.execute({
    sql: `select * from tasks where lead_id = ? order by created_at desc`,
    args: [id],
  });

  const tasks: Task[] = tasksResult.rows.map((row) => ({
    id: String(row.id),
    lead_id: row.lead_id == null ? null : String(row.lead_id),
    client_id: row.client_id == null ? null : String(row.client_id),
    assigned_to: String(row.assigned_to),
    title: String(row.title),
    due_date: row.due_date == null ? null : String(row.due_date),
    status: row.status as Task["status"],
    created_at: String(row.created_at),
  }));

  return NextResponse.json({ lead, tasks });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = await parseJson<{
    status?: LeadStatus;
    assigned_to?: string | null;
    value?: number | null;
    notes?: string | null;
    source?: LeadSource;
  }>(request);

  if (!body) return jsonError("Invalid body", 400);

  await ensureSchema();
  const lead = await loadLead(id);
  if (!lead) return jsonError("Not found", 404);

  if (user.role === "manager" && lead.assigned_to !== user.id) {
    return jsonError("Forbidden", 403);
  }

  const status = body.status ?? lead.status;
  const source = body.source ?? lead.source;
  if (!LEAD_STATUSES.includes(status) || !LEAD_SOURCES.includes(source)) {
    return jsonError("Invalid source or status", 400);
  }

  let assignedTo = lead.assigned_to;
  if (user.role === "admin" && body.assigned_to !== undefined) {
    assignedTo = body.assigned_to;
  }

  const value = body.value !== undefined ? body.value : lead.value;
  const notes = body.notes !== undefined ? body.notes?.trim() || null : lead.notes;
  const updatedAt = new Date().toISOString();

  const db = getTurso();
  await db.execute({
    sql: `update leads
          set status = ?, source = ?, assigned_to = ?, value = ?, notes = ?, updated_at = ?
          where id = ?`,
    args: [status, source, assignedTo, value, notes, updatedAt, id],
  });

  const updated = await loadLead(id);
  return NextResponse.json(updated);
}
