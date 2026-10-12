"use client";

import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/lib/budgets";

const COLORS: Record<BudgetStatus, string> = {
  ok: "bg-green-500",
  low: "bg-amber-500",
  exceeded: "bg-red-500",
};

/** Thin horizontal progress bar colored by budget status. */
export function BudgetMeter({
  pct,
  status,
  className,
}: {
  pct: number;
  status: BudgetStatus;
  className?: string;
}) {
  const width = Math.min(100, Math.max(0, pct * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all", COLORS[status])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}