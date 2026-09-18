"use client";

import { useCallback, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadForm } from "@/components/forms/LeadForm";
import { useOnMount } from "@/lib/useOnMount";
import type { LeadWithClient, User } from "@/types/crm.types";

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadWithClient[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [managers, setManagers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, leadsRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/leads"),
      ]);
      const me = await meRes.json();
      setUser(me.user);
      const leadsData = await leadsRes.json();
      setLeads(Array.isArray(leadsData) ? leadsData : []);

      if (me.user?.role === "admin") {
        const usersRes = await fetch("/api/users");
        const users = await usersRes.json();
        setManagers(Array.isArray(users) ? users.filter((u: User) => u.is_active) : []);
      } else if (me.user) {
        setManagers([me.user]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useOnMount(load);

  return (
    <div>
      <TopBar title="Заявки">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          + Новая заявка
        </button>
      </TopBar>

      {showForm && user ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <LeadForm
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

      {loading || !user ? (
        <p className="text-sm text-[var(--muted)]">Загрузка…</p>
      ) : (
        <KanbanBoard
          key={leads.map((l) => `${l.id}:${l.status}`).join("|")}
          initialLeads={leads}
          showAssignee={user.role === "admin"}
        />
      )}
    </div>
  );
}
