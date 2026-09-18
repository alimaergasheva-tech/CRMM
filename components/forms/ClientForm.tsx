"use client";

import { FormEvent, useState } from "react";

type Props = {
  initial?: {
    name?: string;
    phone?: string;
    email?: string | null;
    notes?: string | null;
  };
  submitLabel?: string;
  onSubmit: (data: {
    name: string;
    phone: string;
    email: string | null;
    notes: string | null;
  }) => Promise<void>;
  onCancel?: () => void;
};

export function ClientForm({ initial, submitLabel = "Сохранить", onSubmit, onCancel }: Props) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await onSubmit({
        name: String(fd.get("name") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
        email: String(fd.get("email") || "").trim() || null,
        notes: String(fd.get("notes") || "").trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Имя" name="name" defaultValue={initial?.name} required />
      <Field label="Телефон" name="phone" defaultValue={initial?.phone} required />
      <Field label="Email" name="email" type="email" defaultValue={initial?.email ?? ""} />
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Заметки</span>
        <textarea
          name="notes"
          defaultValue={initial?.notes ?? ""}
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
        />
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
          >
            Отмена
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}
