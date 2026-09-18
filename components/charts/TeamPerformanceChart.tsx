"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TeamPerformanceChart({
  data,
}: {
  data: { userId: string; userName: string; won: number; total: number }[];
}) {
  const chartData = data.map((d) => ({
    name: d.userName,
    won: d.won,
    total: d.total,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d7ddd6" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="total" fill="#94a3b8" name="Всего" radius={[6, 6, 0, 0]} />
          <Bar dataKey="won" fill="#15803d" name="Успешно" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
