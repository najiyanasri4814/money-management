"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CurrencyTooltip, axisINR, CHART_COLORS } from "./chart-common";

interface Props {
  data: { label: string; income: number; expenses: number }[];
  height?: number;
}

export function TrendLines({ data, height = 260 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        <Tooltip content={<CurrencyTooltip labels={{ income: "Income", expenses: "Expenses" }} />} />
        <Line
          type="monotone"
          dataKey="income"
          name="Income"
          stroke={CHART_COLORS.income}
          strokeWidth={2}
          dot={{ r: 2, fill: CHART_COLORS.income, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke={CHART_COLORS.expense}
          strokeWidth={2}
          dot={{ r: 2, fill: CHART_COLORS.expense, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}