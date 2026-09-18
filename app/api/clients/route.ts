import { NextResponse } from "next/server";
import { jsonError, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { Client } from "@/types/crm.types";

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

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  await ensureSchema();
  const db = getTurso();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  let result;
  if (q) {
    const like = `%${q}%`;
    result = await db.execute({
      sql: `select * from clients
            where name like ? or phone like ? or ifnull(email, '') like ?
            order by created_at desc`,
      args: [like, like, like],
    });
  } else {
    result = await db.execute(
      "select * from clients order by created_at desc",
    );
  }

  return NextResponse.json(result.rows.map((row) => mapClient(row as Record<string, unknown>)));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await parseJson<{
    name?: string;
    phone?: string;
    email?: string | null;
    notes?: string | null;
  }>(request);

  const name = body?.name?.trim();
  const phone = body?.phone?.trim();
  if (!name || !phone) {
    return jsonError("name and phone are required", 400);
  }

  await ensureSchema();
  const db = getTurso();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const email = body?.email?.trim() || null;
  const notes = body?.notes?.trim() || null;

  await db.execute({
    sql: `insert into clients (id, name, phone, email, notes, created_at)
          values (?, ?, ?, ?, ?, ?)`,
    args: [id, name, phone, email, notes, createdAt],
  });

  return NextResponse.json(
    { id, name, phone, email, notes, created_at: createdAt },
    { status: 201 },
  );
}
