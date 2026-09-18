"use client";

import { useCallback, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { TaskForm } from "@/components/forms/TaskForm";
import { useOnMount } from "@/lib/useOnMount";
import type { TaskWithMeta, User } from "@/types/crm.types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithMeta[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [managers, setManagers] = useState<User[]>([]);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [showForm, setShowForm] = useState(false);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const meRes = await fetch("/api/me");
    const me = await meRes.json();
    setUser(me.user);

    const tasksRes = await fetch(`/api/tasks?scope=${scope}`);
    const data = await tasksRes.json();
    setTasks(Array.isArray(data) ? data : []);

    if (me.user?.role === "admin") {
      const usersRes = await fetch("/api/users");
      const users = await usersRes.json();
      setManagers(Array.isArray(users) ? users.filter((u: User) => u.is_active) : []);
    } else if (me.user) {
      setManagers([me.user]);
    }
  }, [scope]);

  useOnMount(load);

  async function toggleDone(task: TaskWithMeta) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: task.status === "done" ? "pending" : "done",
      }),
    });
    if (res.ok) load();
  }

  return (
    <div>
      <TopBar title="Задачи">
        {user?.role === "admin" ? (
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              type="button"
              onClick={() => setScope("mine")}
              className={`px-3 py-2 text-sm ${scope === "mine" ? "bg-[var(--accent)] text-white" : "bg-white"}`}
            >
              Мои
            </button>
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`px-3 py-2 text-sm ${scope === "all" ? "bg-[var(--accent)] text-white" : "bg-white"}`}
            >
              Все
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          + Задача
        </button>
      </TopBar>

      {showForm && user ? (
        <div className="mb-6 max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <TaskForm
            currentUser={user}
            managers={managers}
            onCancel={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      ) : null}

      <ul className="space-y-2">
        {tasks.map((task) => {
          const overdue =
            task.status === "pending" &&
            task.due_date != null &&
            Date.parse(task.due_date) < now;
          return (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <input
                type="checkbox"
                checked={task.status === "done"}
                onChange={() => toggleDone(task)}
                className="mt-1"
              />
              <div className="flex-1">
                <p className={task.status === "done" ? "line-through text-[var(--muted)]" : ""}>
                  {task.title}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {task.assignee_name}
                  {task.client_name ? ` · ${task.client_name}` : ""}
                </p>
              </div>
              {task.due_date ? (
                <span className={`text-sm ${overdue ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
                  {task.due_date.slice(0, 10)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Задач пока нет</p>
      ) : null}
    </div>
  );
}
