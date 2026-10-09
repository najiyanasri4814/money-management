"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CurrencyTooltip, axisINR, CHART_COLORS } from "./chart-common";

interface Props {
  data: { label: string; savings: number }[];
  height?: number;
}

export function SavingsTrendArea({ data, height = 240 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="navyGradient" x1="0" y1="0" x2="0" y2="1">
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
        <Tooltip content={<CurrencyTooltip labels={{ savings: "Savings" }} />} />
        <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="savings"
          name="Savings"
          stroke={CHART_COLORS.savings}
          strokeWidth={2}
          fill="url(#navyGradient)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}