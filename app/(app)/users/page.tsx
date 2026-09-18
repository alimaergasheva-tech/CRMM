"use client";

import { useCallback, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { UserForm } from "@/components/forms/UserForm";
import { useOnMount } from "@/lib/useOnMount";
import type { User } from "@/types/crm.types";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    if (!res.ok) {
      setError("Нет доступа");
      return;
    }
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }, []);

  useOnMount(load);

  async function patchUser(payload: Partial<User> & { id: string }) {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ошибка");
      return;
    }
    load();
  }

  return (
    <div>
      <TopBar title="Сотрудники">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          + Сотрудник
        </button>
      </TopBar>

      {error ? <p className="mb-3 text-sm text-[var(--danger)]">{error}</p> : null}

      {showForm ? (
        <div className="mb-6 max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <UserForm
            onCancel={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--panel)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Имя</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      patchUser({ id: u.id, role: e.target.value as User["role"] })
                    }
                    className="rounded-md border border-[var(--border)] bg-white px-2 py-1"
                  >
                    <option value="manager">manager</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {u.is_active ? (
                    <span className="text-emerald-700">активен</span>
                  ) : (
                    <span className="text-[var(--danger)]">деактивирован</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.is_active ? (
                    <button
                      type="button"
                      onClick={() => patchUser({ id: u.id, is_active: false })}
                      className="text-sm text-[var(--danger)]"
                    >
                      Деактивировать
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => patchUser({ id: u.id, is_active: true })}
                      className="text-sm text-[var(--accent)]"
                    >
                      Активировать
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
