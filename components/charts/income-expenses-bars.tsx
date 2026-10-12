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
import { CurrencyTooltip, axisINR, CHART_COLORS } from "./chart-common";

export interface BarsDatum {
  label: string;
  income?: number;
  expenses?: number;
  savings?: number;
}

interface Props {
  data: BarsDatum[];
  height?: number;
  /** Text shown when there is nothing to chart. */
  emptyText?: string;
}

export function IncomeExpensesBars({
  data,
  height = 280,
  emptyText = "No transactions yet — add one to get started.",
}: Props) {
  const hasSavings = data.some((d) => (d.savings ?? 0) > 0);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-center text-sm text-slate-400"
        style={{ height }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={axisINR}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          content={
            <CurrencyTooltip
              labels={
                hasSavings
                  ? { income: "Income", expenses: "Expenses", savings: "Savings" }
                  : { income: "Income", expenses: "Expenses" }
              }
            />
          }
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: "#334155", fontSize: 12 }}>{value}</span>
          )}
        />
        <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="savings" name="Savings" fill={CHART_COLORS.savings} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}