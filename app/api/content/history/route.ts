import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { ensureSchema, getTurso } from "@/lib/turso";
import type { GeneratedPostRecord, SocialPlatform } from "@/types/crm.types";

function parseHashtags(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);

  await ensureSchema();
  const db = getTurso();
  const result = await db.execute({
    sql: `select id, user_id, platform, topic, title, body, cta, hashtags, created_at
          from generated_posts
          where user_id = ?
          order by created_at desc
          limit 40`,
    args: [user.id],
  });

  const posts: GeneratedPostRecord[] = result.rows.map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    platform: row.platform as SocialPlatform,
    topic: String(row.topic),
    title: String(row.title),
    body: String(row.body),
    cta: String(row.cta),
    hashtags: parseHashtags(row.hashtags),
    created_at: String(row.created_at),
  }));

  return NextResponse.json(posts);
}
