"use client";

import * as React from "react";
import { formatINR, formatCompactINR } from "@/lib/format";

export const CHART_COLORS = {
  income: "#16a34a",
  expense: "#dc2626",
  savings: "#2563eb",
  navy: "#1e2645",
  trend: "#4f46e5",
};

export const CATEGORY_PALETTE = [
  "#1e2645",
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#f43f5e",
  "#84cc16",
  "#06b6d4",
  "#f97316",
  "#64748b",
];

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

interface CurrencyTooltipProps {
  active?: boolean;
  label?: React.ReactNode;
  payload?: TooltipEntry[];
  /** Map internal dataKey -> friendly label. */
  labels?: Record<string, string>;
}

export function CurrencyTooltip({ active, label, payload, labels }: CurrencyTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      {label !== undefined && label !== null && label !== "" && (
        <p className="mb-1.5 font-semibold text-navy-950">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const key = String(entry.dataKey ?? entry.name ?? "");
          const display = labels?.[key] ?? key;
          const value =
            typeof entry.value === "number" ? formatINR(entry.value) : String(entry.value ?? "");
          return (
            <div key={`${key}-${i}`} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? CHART_COLORS.navy }}
                />
                {display}
              </span>
              <span className="font-semibold text-navy-950">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function INRFormatter(value: number) {
  return formatCompactINR(value);
}

/** Axis formatter for charts. */
export const axisINR = (v: number | string) => formatCompactINR(Number(v));