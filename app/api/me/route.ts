import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  await ensureSchema();
  const db = getTurso();
  const overdue = await db.execute({
    sql: `select count(*) as count from tasks
          where assigned_to = ?
            and status = 'pending'
            and due_date is not null
            and due_date < ?`,
    args: [user.id, new Date().toISOString()],
  });

  return NextResponse.json({
    user,
    overdueCount: Number(overdue.rows[0]?.count ?? 0),
  });
}
