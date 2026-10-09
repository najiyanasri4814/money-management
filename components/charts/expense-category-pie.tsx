"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CATEGORY_PALETTE, CurrencyTooltip } from "./chart-common";

export interface PieDatum {
  name: string;
  value: number;
}

interface Props {
  data: PieDatum[];
  height?: number;
}

const MAX_SLICES = 6;

/** Group tiny slices into an "Other" slice so the chart stays readable. */
export function groupSlices(data: PieDatum[]): PieDatum[] {
  if (data.length <= MAX_SLICES) return data;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, MAX_SLICES - 1);
  const rest = sorted.slice(MAX_SLICES - 1);
  const otherValue = rest.reduce((sum, d) => sum + d.value, 0);
  return [...top, { name: "Other", value: otherValue }].filter((d) => d.value > 0);
}

export function ExpenseCategoryPie({ data, height = 280 }: Props) {
  const slices = groupSlices(data);

  if (slices.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
        No expenses recorded yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          strokeWidth={2}
        >
          {slices.map((entry, index) => (
            <Cell key={entry.name} fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip content={<CurrencyTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ color: "#334155", fontSize: 12 }}>{value}</span>
          )}
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}