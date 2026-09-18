"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ClientForm } from "@/components/forms/ClientForm";
import { useOnMount } from "@/lib/useOnMount";
import type { Client } from "@/types/crm.types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (query = "") => {
    const url = query ? `/api/clients?q=${encodeURIComponent(query)}` : "/api/clients";
    const res = await fetch(url);
    const data = await res.json();
    setClients(Array.isArray(data) ? data : []);
  }, []);

  useOnMount(() => load());

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load(q);
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, load]);

  return (
    <div>
      <TopBar title="Клиенты">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          + Клиент
        </button>
      </TopBar>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск по имени или телефону"
        className="mb-4 w-full max-w-md rounded-xl border border-[var(--border)] bg-white px-3 py-2.5"
      />

      {showForm ? (
        <div className="mb-6 max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <ClientForm
            submitLabel="Создать"
            onCancel={() => setShowForm(false)}
            onSubmit={async (data) => {
              const res = await fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error("Не удалось создать клиента");
              setShowForm(false);
              load(q);
            }}
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--panel)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Имя</th>
              <th className="px-4 py-3 font-medium">Телефон</th>
              <th className="px-4 py-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/clients/${c.id}`} className="text-[var(--accent)] hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{c.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">Клиентов пока нет</p>
        ) : null}
      </div>
    </div>
  );
}
