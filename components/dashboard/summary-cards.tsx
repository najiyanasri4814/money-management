"use client";

import { Banknote, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/components/providers/transactions-provider";
import { computeTotals, monthTotals } from "@/lib/stats";
import { monthLongLabel } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  /** YYYY-MM month the three month-scoped cards should show. */
  month: string;
}

/**
 * Overview summary cards.
 *  - Total Income / Total Expenses / Net Cash Flow: scoped to the selected month.
 *    Net Cash Flow = income − expenses (savings are set aside, not an expense).
 *  - Account Balance: all-time income − expenses − savings.
 */
export function SummaryCards({ month }: Props) {
  const { transactions, status } = useTransactions();

  if (!month || (status === "loading" && transactions.length === 0)) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-2xl" />
        ))}
      </div>
    );
  }

  // Don't show fake ₹0.00 figures when the first load failed.
  const failed = status === "error" && transactions.length === 0;

  const m = monthTotals(transactions, month);
  const totals = computeTotals(transactions);
  const label = monthLongLabel(month);
  const netPositive = m.net >= 0;

  const cards = [
    {
      title: "Total Income",
      value: m.income,
      icon: TrendingUp,
      iconClass: "bg-green-100 text-green-700",
      sub: label,
      accent: "text-green-600",
    },
    {
      title: "Total Expenses",
      value: m.expenses,
      icon: TrendingDown,
      iconClass: "bg-red-100 text-red-600",
      sub: label,
      accent: "text-red-600",
    },
    {
      title: "Net Cash Flow",
      value: m.net,
      icon: Wallet,
      iconClass: netPositive ? "bg-navy-900 text-white" : "bg-red-100 text-red-600",
      sub: netPositive
        ? `${label} · income − expenses`
        : `Spent more than earned in ${label}`,
      accent: netPositive ? "text-navy-950" : "text-red-600",
    },
    {
      title: "Account Balance",
      value: totals.balance,
      icon: Banknote,
      iconClass: "bg-blue-100 text-blue-700",
      sub: "Income − expenses − savings · all time",
      accent: totals.balance >= 0 ? "text-navy-950" : "text-red-600",
      savings: totals.totalSavings,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  failed ? "bg-slate-100 text-slate-400" : card.iconClass
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <p
              className={cn(
                "mt-3 text-2xl font-bold tracking-tight",
                failed ? "text-slate-400" : card.accent
              )}
            >
              {failed ? "—" : formatINR(card.value)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {failed ? "Unable to load data" : card.sub}
            </p>
            {"savings" in card && card.savings !== undefined && !failed && (
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Set aside as savings</span>
                  <span className="font-semibold tabular-nums text-blue-600">
                    {formatINR(card.savings)}
                  </span>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}