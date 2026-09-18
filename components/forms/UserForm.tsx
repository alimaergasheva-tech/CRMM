"use client";

import { FormEvent, useState } from "react";
import type { UserRole } from "@/types/crm.types";

type Props = {
  onCreated: () => void;
  onCancel: () => void;
};

export function UserForm({ onCreated, onCancel }: Props) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(fd.get("name") || "").trim(),
          email: String(fd.get("email") || "").trim(),
          password: String(fd.get("password") || ""),
          role: String(fd.get("role") || "manager") as UserRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось создать пользователя");
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Имя</span>
        <input name="name" required className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Email</span>
        <input name="email" type="email" required className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Временный пароль</span>
        <input name="password" type="password" required minLength={6} className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Роль</span>
        <select name="role" defaultValue="manager" className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2">
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {loading ? "…" : "Создать"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
          Отмена
        </button>
      </div>
    </form>
  );
}
