"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Client, LeadSource, User } from "@/types/crm.types";
import { LEAD_SOURCE_LABELS, LEAD_SOURCES } from "@/types/crm.types";
import { ClientForm } from "@/components/forms/ClientForm";

type Props = {
  currentUser: User;
  managers?: User[];
  defaultClientId?: string;
  onCreated: () => void;
  onCancel: () => void;
};

export function LeadForm({
  currentUser,
  managers = [],
  defaultClientId,
  onCreated,
  onCancel,
}: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [mode, setMode] = useState<"existing" | "new">(
    defaultClientId ? "existing" : "existing",
  );
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => undefined);
  }, []);

  async function createLead(payload: {
    client_id: string;
    source: LeadSource;
    assigned_to: string | null;
    value: number | null;
    notes: string | null;
  }) {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Не удалось создать заявку");
    }
    onCreated();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === "new") return;
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const valueRaw = String(fd.get("value") || "").trim();
      await createLead({
        client_id: clientId,
        source: String(fd.get("source")) as LeadSource,
        assigned_to:
          currentUser.role === "admin"
            ? String(fd.get("assigned_to") || "") || null
            : currentUser.id,
        value: valueRaw ? Number(valueRaw) : null,
        notes: String(fd.get("notes") || "").trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            mode === "existing"
              ? "bg-[var(--accent)] text-white"
              : "border border-[var(--border)]"
          }`}
        >
          Существующий клиент
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            mode === "new"
              ? "bg-[var(--accent)] text-white"
              : "border border-[var(--border)]"
          }`}
        >
          Новый клиент
        </button>
      </div>

      {mode === "new" ? (
        <ClientForm
          submitLabel="Создать клиента и заявку"
          onCancel={onCancel}
          onSubmit={async (data) => {
            const clientRes = await fetch("/api/clients", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (!clientRes.ok) throw new Error("Не удалось создать клиента");
            const client = await clientRes.json();
            await createLead({
              client_id: client.id,
              source: "manual",
              assigned_to: currentUser.id,
              value: null,
              notes: null,
            });
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Клиент</span>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
            >
              <option value="">Выберите клиента</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Источник</span>
            <select
              name="source"
              defaultValue="manual"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          {currentUser.role === "admin" ? (
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Назначить</span>
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

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Сумма</span>
            <input
              name="value"
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Заметки</span>
            <textarea
              name="notes"
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2"
            />
          </label>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !clientId}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "…" : "Создать заявку"}
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
      )}
    </div>
  );
}
