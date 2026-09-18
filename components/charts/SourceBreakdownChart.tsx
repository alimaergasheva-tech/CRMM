"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LeadSource } from "@/types/crm.types";
import { LEAD_SOURCE_LABELS } from "@/types/crm.types";

export function SourceBreakdownChart({
  data,
}: {
  data: { source: LeadSource; count: number }[];
}) {
  const chartData = data.map((d) => ({
    name: LEAD_SOURCE_LABELS[d.source],
    count: d.count,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d7ddd6" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#1d4e89" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
