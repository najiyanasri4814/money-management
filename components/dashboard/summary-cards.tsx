"use client";

import { Banknote, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/components/providers/transactions-provider";
import { computeTotals } from "@/lib/stats";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SummaryCards() {
  const { transactions, status } = useTransactions();
  const totals = computeTotals(transactions);

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-2xl" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Balance",
      value: totals.balance,
      icon: Wallet,
      iconClass: "bg-navy-900 text-white",
      sub: `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`,
      accent: totals.balance >= 0 ? "text-navy-950" : "text-red-600",
      showBreakdown: false,
    },
    {
      title: "Total Income",
      value: totals.totalIncome,
      icon: TrendingUp,
      iconClass: "bg-green-100 text-green-700",
      sub: "All time",
      accent: "text-green-600",
      showBreakdown: false,
    },
    {
      title: "Total Expenses",
      value: totals.totalExpenses,
      icon: TrendingDown,
      iconClass: "bg-red-100 text-red-600",
      sub: "All time",
      accent: "text-red-600",
      showBreakdown: false,
    },
    {
      title: "Total Savings",
      value: totals.totalSavings,
      icon: Banknote,
      iconClass: "bg-blue-100 text-blue-700",
      sub: "Set aside, not an expense",
      accent: "text-blue-700",
      showBreakdown: false,
    },
    {
      title: "Current Month Savings",
      value: totals.currentMonthSavings,
      icon: PiggyBank,
      iconClass: "bg-indigo-100 text-indigo-700",
      sub: `${totals.currentMonthSavings >= 0 ? "Saving" : "Overspending"} this month`,
      accent: totals.currentMonthSavings >= 0 ? "text-navy-950" : "text-red-600",
      showBreakdown: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="p-5 transition-shadow hover:shadow-card-hover">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  card.iconClass
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <p className={cn("mt-3 text-2xl font-bold tracking-tight", card.accent)}>
              {formatINR(card.value)}
            </p>
            <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
            {card.showBreakdown && (
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Income this month</span>
                  <span className="font-semibold tabular-nums text-green-600">
                    + {formatINR(totals.currentMonthIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Expenses this month</span>
                  <span className="font-semibold tabular-nums text-red-600">
                    − {formatINR(totals.currentMonthExpenses)}
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