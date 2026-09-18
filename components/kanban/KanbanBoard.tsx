"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { LeadStatus, LeadWithClient } from "@/types/crm.types";
import { LEAD_STATUSES } from "@/types/crm.types";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";

export function KanbanBoard({
  initialLeads,
  showAssignee,
}: {
  initialLeads: LeadWithClient[];
  showAssignee: boolean;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [toast, setToast] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      LEAD_STATUSES.map((s) => [s, [] as LeadWithClient[]]),
    ) as Record<LeadStatus, LeadWithClient[]>;
    for (const lead of leads) {
      map[lead.status].push(lead);
    }
    return map;
  }, [leads]);

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const nextStatus = String(over.id) as LeadStatus;
    if (!LEAD_STATUSES.includes(nextStatus)) return;

    const current = leads.find((l) => l.id === leadId);
    if (!current || current.status === nextStatus) return;

    const prev = leads;
    setLeads((list) =>
      list.map((l) =>
        l.id === leadId
          ? { ...l, status: nextStatus, updated_at: new Date().toISOString() }
          : l,
      ),
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("patch failed");
      const updated = await res.json();
      setLeads((list) => list.map((l) => (l.id === leadId ? { ...l, ...updated } : l)));
    } catch {
      setLeads(prev);
      setToast("Не удалось обновить статус");
      setTimeout(() => setToast(""), 3000);
    }
  }

  return (
    <div className="relative">
      {toast ? (
        <div className="absolute right-0 top-0 z-10 rounded-lg bg-[var(--danger)] px-3 py-2 text-sm text-white">
          {toast}
        </div>
      ) : null}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={byStatus[status]}
              showAssignee={showAssignee}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
