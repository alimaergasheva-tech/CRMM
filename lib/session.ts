import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/auth";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { User } from "@/types/crm.types";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;

  await ensureSchema();
  const db = getTurso();
  const result = await db.execute({
    sql: `select id, name, email, role, created_at, is_active
          from users where id = ? and is_active = 1 limit 1`,
    args: [session.userId],
  });

  const row = result.rows[0];
  if (!row) {
    // Старый JWT без пользователя в БД — иначе proxy↔dashboard зацикливаются
    await clearSessionCookie();
    return null;
  }

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as User["role"],
    created_at: String(row.created_at),
    is_active: Boolean(row.is_active),
  };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
