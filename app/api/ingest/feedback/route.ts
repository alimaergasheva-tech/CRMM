import { NextResponse } from "next/server";
import { jsonError, parseJson } from "@/lib/api";
import { ensureSchema, getTurso } from "@/lib/turso";

export const runtime = "nodejs";

function assertIngestAuth(request: Request) {
  const secret = process.env.CRM_INGEST_SECRET?.trim();
  if (!secret) return false;

  const header =
    request.headers.get("authorization") ??
    request.headers.get("x-api-key") ??
    "";

  if (header === secret) return true;
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() === secret;
  }
  return false;
}

function splitContact(contact: string): { phone: string; email: string | null } {
  const value = contact.trim();
  if (!value) return { phone: "не указан", email: null };
  if (value.includes("@")) return { phone: value, email: value };
  return { phone: value, email: null };
}

export async function POST(request: Request) {
  try {
    if (!assertIngestAuth(request)) {
      return jsonError("Unauthorized", 401);
    }

    const body = await parseJson<{
      name?: string;
      contact?: string;
      message?: string;
      source?: string;
    }>(request);

    const name = body?.name?.trim() || "Гость сайта";
    const contact = body?.contact?.trim() ?? "";
    const message = body?.message?.trim() ?? "";

    if (!message) {
      return jsonError("message is required", 400);
    }

    const source =
      body?.source === "telegram_bot" ? "telegram_bot" : "website_form";
    const { phone, email } = splitContact(contact);

    await ensureSchema();
    const db = getTurso();
    const now = new Date().toISOString();

    let clientId: string | null = null;

    if (email) {
      const byEmail = await db.execute({
        sql: "select id from clients where email = ? limit 1",
        args: [email],
      });
      if (byEmail.rows[0]) clientId = String(byEmail.rows[0].id);
    }

    if (!clientId && phone !== "не указан") {
      const byPhone = await db.execute({
        sql: "select id from clients where phone = ? limit 1",
        args: [phone],
      });
      if (byPhone.rows[0]) clientId = String(byPhone.rows[0].id);
    }

    if (!clientId) {
      clientId = crypto.randomUUID();
      await db.execute({
        sql: `insert into clients (id, name, phone, email, notes, created_at)
              values (?, ?, ?, ?, ?, ?)`,
        args: [clientId, name, phone, email, "Источник: форма сайта Astera", now],
      });
    } else {
      await db.execute({
        sql: `update clients
              set name = case when name = '' or name = 'Гость сайта' then ? else name end,
                  email = coalesce(email, ?)
              where id = ?`,
        args: [name, email, clientId],
      });
    }

    const leadId = crypto.randomUUID();
    await db.execute({
      sql: `insert into leads
            (id, client_id, source, status, assigned_to, value, notes, created_at, updated_at)
            values (?, ?, ?, 'new', null, null, ?, ?, ?)`,
      args: [leadId, clientId, source, message, now, now],
    });

    return NextResponse.json(
      { success: true, leadId, clientId },
      { status: 201 },
    );
  } catch (error) {
    console.error("Ingest feedback error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return jsonError(`Ingest failed: ${detail}`, 500);
  }
}
