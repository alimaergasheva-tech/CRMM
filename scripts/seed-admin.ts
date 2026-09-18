import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local");
  }

  if (!process.env.JWT_SECRET) {
    console.warn("Warning: JWT_SECRET is not set yet.");
  }

  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });

  const url = process.env.TURSO_DATABASE_URL ?? "file:./data/crm.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const db = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });

  await db.executeMultiple(`
    create table if not exists users (
      id text primary key,
      name text not null,
      email text not null unique,
      password_hash text not null,
      role text not null default 'manager',
      is_active integer not null default 1,
      created_at text not null
    );
  `);

  const existing = await db.execute({
    sql: "select id from users where email = ? limit 1",
    args: [email.toLowerCase()],
  });

  if (existing.rows.length > 0) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  await db.execute({
    sql: `insert into users (id, name, email, password_hash, role, is_active, created_at)
          values (?, ?, ?, ?, 'admin', 1, ?)`,
    args: [id, name, email.toLowerCase(), passwordHash, createdAt],
  });

  console.log(`Admin created: ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
