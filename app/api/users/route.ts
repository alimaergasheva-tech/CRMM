import { NextResponse } from "next/server";
import { jsonError, parseJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { User, UserRole } from "@/types/crm.types";

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as UserRole,
    created_at: String(row.created_at),
    is_active: Boolean(row.is_active),
  };
}

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError("Unauthorized", 401) as NextResponse };
  if (user.role !== "admin") {
    return { error: jsonError("Forbidden", 403) as NextResponse };
  }
  return { user };
}

export async function GET() {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;

  await ensureSchema();
  const db = getTurso();
  const result = await db.execute(
    `select id, name, email, role, created_at, is_active from users order by created_at desc`,
  );

  return NextResponse.json(result.rows.map((row) => mapUser(row as Record<string, unknown>)));
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;

  const body = await parseJson<{
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
  }>(request);

  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  const role = body?.role ?? "manager";

  if (!name || !email || !password) {
    return jsonError("name, email and password are required", 400);
  }
  if (role !== "admin" && role !== "manager") {
    return jsonError("Invalid role", 400);
  }

  await ensureSchema();
  const db = getTurso();

  const existing = await db.execute({
    sql: "select id from users where email = ? limit 1",
    args: [email],
  });
  if (existing.rows[0]) return jsonError("Email already exists", 409);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  await db.execute({
    sql: `insert into users (id, name, email, password_hash, role, is_active, created_at)
          values (?, ?, ?, ?, ?, 1, ?)`,
    args: [id, name, email, passwordHash, role, createdAt],
  });

  return NextResponse.json(
    { id, name, email, role, created_at: createdAt, is_active: true },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;

  const body = await parseJson<{
    id?: string;
    role?: UserRole;
    is_active?: boolean;
    name?: string;
  }>(request);

  if (!body?.id) return jsonError("id is required", 400);

  await ensureSchema();
  const db = getTurso();
  const existing = await db.execute({
    sql: "select * from users where id = ? limit 1",
    args: [body.id],
  });
  const row = existing.rows[0];
  if (!row) return jsonError("Not found", 404);

  const current = mapUser(row as Record<string, unknown>);
  const role = body.role ?? current.role;
  if (role !== "admin" && role !== "manager") {
    return jsonError("Invalid role", 400);
  }

  const isActive =
    body.is_active === undefined ? current.is_active : body.is_active;
  const name = body.name?.trim() ?? current.name;

  if (body.id === auth.user!.id && !isActive) {
    return jsonError("Cannot deactivate yourself", 400);
  }

  await db.execute({
    sql: `update users set name = ?, role = ?, is_active = ? where id = ?`,
    args: [name, role, isActive ? 1 : 0, body.id],
  });

  return NextResponse.json({
    ...current,
    name,
    role,
    is_active: isActive,
  });
}
