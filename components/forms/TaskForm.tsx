"use client";

import { FormEvent, useState } from "react";
import type { User } from "@/types/crm.types";

type Props = {
  currentUser: User;
  managers?: User[];
  defaultLeadId?: string | null;
  defaultClientId?: string | null;
  onCreated: () => void;
  onCancel: () => void;
};

export function TaskForm({
  currentUser,
  managers = [],
  defaultLeadId = null,
  defaultClientId = null,
  onCreated,
  onCancel,
}: Props) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(fd.get("title") || "").trim(),
          due_date: String(fd.get("due_date") || "") || null,
          assigned_to:
            currentUser.role === "admin"
              ? String(fd.get("assigned_to") || currentUser.id)
              : currentUser.id,
          lead_id: defaultLeadId,
          client_id: defaultClientId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось создать задачу");
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
        <span className="mb-1 block text-[var(--muted)]">Название</span>
        <input
          name="title"
          required
          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Срок</span>
        <input
          name="due_date"
          type="date"
          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
        />
      </label>
      {currentUser.role === "admin" ? (
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Исполнитель</span>
          <select
            name="assigned_to"
            defaultValue={currentUser.id}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
          >
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "…" : "Создать"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
