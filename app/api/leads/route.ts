import { NextResponse } from "next/server";
import { jsonError, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { LeadSource, LeadStatus, LeadWithClient } from "@/types/crm.types";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/types/crm.types";

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  await ensureSchema();
  const db = getTurso();

  const args: string[] = [];
  let where = "";
  if (user.role === "manager") {
    where = "where l.assigned_to = ?";
    args.push(user.id);
  }

  const result = await db.execute({
    sql: `select l.*, c.name as client_name, c.phone as client_phone, u.name as assignee_name
          from leads l
          join clients c on c.id = l.client_id
          left join users u on u.id = l.assigned_to
          ${where}
          order by l.updated_at desc`,
    args,
  });

  return NextResponse.json(result.rows.map((row) => mapLead(row as Record<string, unknown>)));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await parseJson<{
    client_id?: string;
    source?: LeadSource;
    status?: LeadStatus;
    assigned_to?: string | null;
    value?: number | null;
    notes?: string | null;
  }>(request);

  if (!body?.client_id) {
    return jsonError("client_id is required", 400);
  }

  const source = body.source ?? "manual";
  const status = body.status ?? "new";
  if (!LEAD_SOURCES.includes(source) || !LEAD_STATUSES.includes(status)) {
    return jsonError("Invalid source or status", 400);
  }

  let assignedTo = body.assigned_to ?? user.id;
  if (user.role === "manager") {
    assignedTo = user.id;
  }

  await ensureSchema();
  const db = getTurso();

  const clientCheck = await db.execute({
    sql: "select id from clients where id = ? limit 1",
    args: [body.client_id],
  });
  if (!clientCheck.rows[0]) return jsonError("Client not found", 404);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const value = body.value ?? null;
  const notes = body.notes?.trim() || null;

  await db.execute({
    sql: `insert into leads
          (id, client_id, source, status, assigned_to, value, notes, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, body.client_id, source, status, assignedTo, value, notes, now, now],
  });

  const created = await db.execute({
    sql: `select l.*, c.name as client_name, c.phone as client_phone, u.name as assignee_name
          from leads l
          join clients c on c.id = l.client_id
          left join users u on u.id = l.assigned_to
          where l.id = ?`,
    args: [id],
  });

  return NextResponse.json(
    mapLead(created.rows[0] as Record<string, unknown>),
    { status: 201 },
  );
}
