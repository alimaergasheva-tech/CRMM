"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { LeadWithClient } from "@/types/crm.types";
import { LEAD_SOURCE_LABELS } from "@/types/crm.types";

export function LeadCard({
  lead,
  showAssignee,
}: {
  lead: LeadWithClient;
  showAssignee: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { status: lead.status },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-xl border border-[var(--border)] bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      <Link
        href={`/leads/${lead.id}`}
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-[var(--ink)] hover:text-[var(--accent)]"
      >
        {lead.client_name}
      </Link>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {LEAD_SOURCE_LABELS[lead.source]}
      </p>
      {lead.value != null ? (
        <p className="mt-2 text-sm font-medium text-[var(--ink)]">
          {lead.value.toLocaleString("ru-RU")} ₽
        </p>
      ) : null}
      {showAssignee && lead.assignee_name ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{lead.assignee_name}</p>
      ) : null}
    </div>
  );
}
