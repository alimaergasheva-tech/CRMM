"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { LeadForm } from "@/components/forms/LeadForm";
import { useOnMount } from "@/lib/useOnMount";
import type { Client, Lead, User } from "@/types/crm.types";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/types/crm.types";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [managers, setManagers] = useState<User[]>([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [meRes, clientRes] = await Promise.all([
      fetch("/api/me"),
      fetch(`/api/clients/${params.id}`),
    ]);
    if (!clientRes.ok) {
      setError("Клиент не найден");
      return;
    }
    const me = await meRes.json();
    const data = await clientRes.json();
    setUser(me.user);
    setClient(data.client);
    setLeads(data.leads);
    if (me.user?.role === "admin") {
      const usersRes = await fetch("/api/users");
      const users = await usersRes.json();
      setManagers(Array.isArray(users) ? users.filter((u: User) => u.is_active) : []);
    } else if (me.user) {
      setManagers([me.user]);
    }
  }, [params.id]);

  useOnMount(load);

  if (error) {
    return (
      <div>
        <TopBar title="Клиент" />
        <p className="text-[var(--danger)]">{error}</p>
      </div>
    );
  }

  if (!client || !user) {
    return <p className="text-sm text-[var(--muted)]">Загрузка…</p>;
  }

  return (
    <div>
      <TopBar title={client.name}>
        <button
          type="button"
          onClick={() => setShowLeadForm(true)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          + Заявка
        </button>
      </TopBar>

      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
        <p>Телефон: {client.phone}</p>
        <p className="mt-1">Email: {client.email ?? "—"}</p>
        <p className="mt-1 text-[var(--muted)]">{client.notes ?? "Без заметок"}</p>
      </div>

      {showLeadForm ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <LeadForm
            currentUser={user}
            managers={managers}
            defaultClientId={client.id}
            onCancel={() => setShowLeadForm(false)}
            onCreated={() => {
              setShowLeadForm(false);
              load();
            }}
          />
        </div>
      ) : null}

      <h2 className="mb-3 text-sm font-semibold">История заявок</h2>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--panel)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Источник</th>
              <th className="px-4 py-3 font-medium">Дата</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="text-[var(--accent)]">
                    {LEAD_STATUS_LABELS[lead.status]}
                  </Link>
                </td>
                <td className="px-4 py-3">{LEAD_SOURCE_LABELS[lead.source]}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {lead.created_at.slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">Заявок пока нет</p>
        ) : null}
      </div>
    </div>
  );
}
