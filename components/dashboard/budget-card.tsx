"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Target, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetMeter } from "@/components/budgets/budget-meter";
import { useBudgets } from "@/components/providers/budgets-provider";
import { useTransactions } from "@/components/providers/transactions-provider";
import {
  categoryBudgets,
  currentMonthKey,
  emptyBudgets,
  totalBudgetStatus,
} from "@/lib/budgets";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

function pctLabel(pct: number): string {
  return `${Math.min(999, Math.round(pct * 100))}%`;
}

/** Overview card: this month's overall budget + at-risk categories. */
export function BudgetCard() {
  const { transactions, status: txStatus } = useTransactions();
  const { budgetsByMonth, status: budgetStatus } = useBudgets();

  const month = currentMonthKey();
  const budgets = budgetsByMonth[month] ?? emptyBudgets();
  const total = totalBudgetStatus(transactions, budgets, month);
  const atRisk = categoryBudgets(transactions, budgets, month)
    .filter((c) => c.status !== "ok")
    .slice(0, 4);

  if (txStatus === "loading" || budgetStatus === "loading") {
    return <Skeleton className="h-36 w-full rounded-2xl" />;
  }

  const hasBudgets = budgets.total > 0 || Object.keys(budgets.categories).length > 0;

  if (!hasBudgets) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-400" />
            This month&apos;s budget
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-slate-500">
            <Link href="/budgets">
              Set budget
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Set a monthly budget for your main spending categories and get a
            warning when the money starts running low.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-slate-400" />
          This month&apos;s budget
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-slate-500">
          <Link href="/budgets">
            Manage
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {total && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-navy-950">Overall monthly budget</span>
              <span className="tabular-nums text-slate-500">
                {formatINR(total.spent)} of {formatINR(total.budgeted)}{" "}
                <span
                  className={cn(
                    "ml-1 font-semibold",
                    total.status === "exceeded"
                      ? "text-red-600"
                      : total.status === "low"
                        ? "text-amber-600"
                        : "text-green-600"
                  )}
                >
                  ({pctLabel(total.pct)})
                </span>
              </span>
            </div>
            <BudgetMeter pct={total.pct} status={total.status} />
            <p
              className={cn(
                "text-xs",
                total.status === "exceeded"
                  ? "text-red-600"
                  : total.status === "low"
                    ? "text-amber-600"
                    : "text-slate-400"
              )}
            >
              {total.status === "exceeded"
                ? `Over budget by ${formatINR(-total.remaining)}`
                : `${formatINR(total.remaining)} left for the rest of the month`}
            </p>
          </div>
        )}

        {atRisk.length > 0 && (
          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              <TriangleAlert className="h-3.5 w-3.5" />
              Running low this month
            </p>
            {atRisk.map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-navy-950">{c.category}</span>
                  <span
                    className={cn(
                      "tabular-nums",
                      c.status === "exceeded" ? "text-red-600" : "text-amber-600"
                    )}
                  >
                    {formatINR(c.spent)} of {formatINR(c.budgeted)} ({pctLabel(c.pct)})
                  </span>
                </div>
                <BudgetMeter pct={c.pct} status={c.status} />
              </div>
            ))}
          </div>
        )}

        {total === null && atRisk.length === 0 && hasBudgets && (
          <p className="text-sm text-slate-500">
            No overall budget set — category budgets are tracked on the{" "}
            <Link href="/budgets" className="font-medium text-navy-950 underline">
              Budgets
            </Link>{" "}
            page.
          </p>
        )}
      </CardContent>
    </Card>
  );
}