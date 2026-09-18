import { NextResponse } from "next/server";
import { jsonError, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { Client, Lead } from "@/types/crm.types";

type Params = { params: Promise<{ id: string }> };

function mapClient(row: Record<string, unknown>): Client {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: row.email == null ? null : String(row.email),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
  };
}

function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    source: row.source as Lead["source"],
    status: row.status as Lead["status"],
    assigned_to: row.assigned_to == null ? null : String(row.assigned_to),
    value: row.value == null ? null : Number(row.value),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  await ensureSchema();
  const db = getTurso();

  const clientResult = await db.execute({
    sql: "select * from clients where id = ? limit 1",
    args: [id],
  });
  const clientRow = clientResult.rows[0];
  if (!clientRow) return jsonError("Not found", 404);

  const leadsResult = await db.execute({
    sql: `select * from leads where client_id = ? order by created_at desc`,
    args: [id],
  });

  return NextResponse.json({
    client: mapClient(clientRow as Record<string, unknown>),
    leads: leadsResult.rows.map((row) => mapLead(row as Record<string, unknown>)),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = await parseJson<{
    name?: string;
    phone?: string;
    email?: string | null;
    notes?: string | null;
  }>(request);

  if (!body) return jsonError("Invalid body", 400);

  await ensureSchema();
  const db = getTurso();
  const existing = await db.execute({
    sql: "select * from clients where id = ? limit 1",
    args: [id],
  });
  if (!existing.rows[0]) return jsonError("Not found", 404);

  const current = mapClient(existing.rows[0] as Record<string, unknown>);
  const name = body.name?.trim() ?? current.name;
  const phone = body.phone?.trim() ?? current.phone;
  const email =
    body.email === undefined
      ? current.email
      : body.email?.trim() || null;
  const notes =
    body.notes === undefined
      ? current.notes
      : body.notes?.trim() || null;

  await db.execute({
    sql: `update clients set name = ?, phone = ?, email = ?, notes = ? where id = ?`,
    args: [name, phone, email, notes, id],
  });

  return NextResponse.json({ id, name, phone, email, notes, created_at: current.created_at });
}
