"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CurrencyTooltip, axisINR, CHART_COLORS } from "./chart-common";

export interface TrendPoint {
  label: string;
  /** Net cash flow: income − expenses for that month. */
  net: number;
  /** Amount set aside as savings (type "savings") for that month. */
  saved?: number;
}

interface Props {
  data: TrendPoint[];
  height?: number;
  /** Text shown when there is nothing to chart. */
  emptyText?: string;
}

export function SavingsTrendArea({
  data,
  height = 240,
  emptyText = "No transactions yet — add one to get started.",
}: Props) {
  const gradientId = React.useId().replace(/:/g, "");
  const hasSaved = data.some((d) => (d.saved ?? 0) > 0);

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
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.savings} stopOpacity={0.25} />
            <stop offset="95%" stopColor={CHART_COLORS.savings} stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
              labels={{
                net: "Income − expenses",
                saved: "Set aside as savings",
              }}
            />
          }
        />
        <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="net"
          name="Income − expenses"
          stroke={CHART_COLORS.savings}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4 }}
        />
        {hasSaved && (
          <Area
            type="monotone"
            dataKey="saved"
            name="Set aside"
            stroke="#0ea5e9"
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="none"
            dot={false}
            activeDot={{ r: 4 }}
          />
        )}
        {hasSaved && (
          <Legend
            formatter={(value) => (
              <span style={{ color: "#334155", fontSize: 12 }}>{value}</span>
            )}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}