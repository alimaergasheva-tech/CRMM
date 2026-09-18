import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifyPassword,
} from "@/lib/auth";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { UserRole } from "@/types/crm.types";

const GENERIC_ERROR = "неверный email или пароль";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    await ensureSchema();
    const db = getTurso();
    const result = await db.execute({
      sql: `select id, password_hash, role, is_active
            from users where email = ? limit 1`,
      args: [email],
    });

    const row = result.rows[0];
    if (!row || !row.is_active) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const ok = await verifyPassword(password, String(row.password_hash));
    if (!ok) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const token = await signSession({
      userId: String(row.id),
      role: row.role as UserRole,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
