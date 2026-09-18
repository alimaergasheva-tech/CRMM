"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { LeadStatus } from "@/types/crm.types";
import { LEAD_STATUS_LABELS } from "@/types/crm.types";

const COLORS = ["#0f766e", "#1d4e89", "#c2410c", "#15803d", "#7f1d1d"];

export function StatusBreakdownChart({
  data,
}: {
  data: { status: LeadStatus; count: number }[];
}) {
  const chartData = data.map((d) => ({
    name: LEAD_STATUS_LABELS[d.status],
    value: d.count,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
