"use client";

import Link from "next/link";
import { FormEvent, useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { TaskForm } from "@/components/forms/TaskForm";
import { useOnMount } from "@/lib/useOnMount";
import type { LeadStatus, LeadWithClient, Task, User } from "@/types/crm.types";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, LEAD_STATUSES } from "@/types/crm.types";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadWithClient | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [managers, setManagers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const [meRes, leadRes] = await Promise.all([
      fetch("/api/me"),
      fetch(`/api/leads/${params.id}`),
    ]);
    if (leadRes.status === 403) {
      setError("Нет доступа к этой заявке");
      return;
    }
    if (!leadRes.ok) {
      setError("Заявка не найдена");
      return;
    }
    const me = await meRes.json();
    const data = await leadRes.json();
    setUser(me.user);
    setLead(data.lead);
    setTasks(data.tasks);
    setNotes(data.lead.notes ?? "");

    if (me.user?.role === "admin") {
      const usersRes = await fetch("/api/users");
      const users = await usersRes.json();
      setManagers(Array.isArray(users) ? users.filter((u: User) => u.is_active) : []);
    } else if (me.user) {
      setManagers([me.user]);
    }
  }, [params.id]);

  useOnMount(load);

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Ошибка сохранения");
    }
    const updated = await res.json();
    setLead(updated);
  }

  async function saveNotes(e: FormEvent) {
    e.preventDefault();
    try {
      await patch({ notes });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  if (error && !lead) {
    return (
      <div>
        <TopBar title="Заявка" />
        <p className="text-[var(--danger)]">{error}</p>
        <Link href="/leads" className="mt-3 inline-block text-sm text-[var(--accent)]">
          ← К заявкам
        </Link>
      </div>
    );
  }

  if (!lead || !user) {
    return <p className="text-sm text-[var(--muted)]">Загрузка…</p>;
  }

  return (
    <div>
      <TopBar title={lead.client_name}>
        <Link href="/leads" className="text-sm text-[var(--accent)]">
          ← К доске
        </Link>
      </TopBar>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">
            Клиент:{" "}
            <Link href={`/clients/${lead.client_id}`} className="text-[var(--accent)]">
              {lead.client_name}
            </Link>{" "}
            · {lead.client_phone}
          </p>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Статус</span>
            <select
              value={lead.status}
              onChange={async (e) => {
                try {
                  await patch({ status: e.target.value as LeadStatus });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Ошибка");
                }
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <p className="text-sm">
            Источник: <strong>{LEAD_SOURCE_LABELS[lead.source]}</strong>
          </p>

          {user.role === "admin" ? (
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Назначен</span>
              <select
                value={lead.assigned_to ?? ""}
                onChange={async (e) => {
                  try {
                    await patch({ assigned_to: e.target.value || null });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Ошибка");
                  }
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
              >
                <option value="">Не назначен</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm">Исполнитель: {lead.assignee_name ?? "—"}</p>
          )}

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Сумма</span>
            <input
              type="number"
              defaultValue={lead.value ?? ""}
              onBlur={async (e) => {
                const value = e.target.value ? Number(e.target.value) : null;
                try {
                  await patch({ value });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Ошибка");
                }
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
            />
          </label>

          <form onSubmit={saveNotes} className="space-y-2">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Заметки</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Сохранить заметки
            </button>
          </form>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Задачи</h2>
            <button
              type="button"
              onClick={() => setShowTaskForm(true)}
              className="text-sm text-[var(--accent)]"
            >
              + Задача
            </button>
          </div>
          {showTaskForm ? (
            <div className="mb-4">
              <TaskForm
                currentUser={user}
                managers={managers}
                defaultLeadId={lead.id}
                defaultClientId={lead.client_id}
                onCancel={() => setShowTaskForm(false)}
                onCreated={() => {
                  setShowTaskForm(false);
                  load();
                }}
              />
            </div>
          ) : null}
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <p className={task.status === "done" ? "line-through text-[var(--muted)]" : ""}>
                  {task.title}
                </p>
                {task.due_date ? (
                  <p className="text-xs text-[var(--muted)]">{task.due_date.slice(0, 10)}</p>
                ) : null}
              </li>
            ))}
            {tasks.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">Пока нет задач</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
