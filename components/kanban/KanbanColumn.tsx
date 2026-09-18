"use client";

import { useDroppable } from "@dnd-kit/core";
import type { LeadStatus, LeadWithClient } from "@/types/crm.types";
import { LEAD_STATUS_LABELS } from "@/types/crm.types";
import { LeadCard } from "@/components/kanban/LeadCard";

export function KanbanColumn({
  status,
  leads,
  showAssignee,
}: {
  status: LeadStatus;
  leads: LeadWithClient[];
  showAssignee: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[420px] w-64 shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)]/70 p-3 transition ${
        isOver ? "ring-2 ring-[var(--accent)]" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-[var(--ink)]">
          {LEAD_STATUS_LABELS[status]}
        </h3>
        <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs text-[var(--muted)]">
          {leads.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} showAssignee={showAssignee} />
        ))}
      </div>
    </div>
  );
}
