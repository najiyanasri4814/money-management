"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Download,
  Loader2,
  PieChart as PieIcon,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BudgetCard } from "@/components/dashboard/budget-card";
import { IncomeExpensesBars } from "@/components/charts/income-expenses-bars";
import { ExpenseCategoryPie } from "@/components/charts/expense-category-pie";
import { SavingsTrendArea } from "@/components/charts/savings-trend-area";
import { useTransactions } from "@/components/providers/transactions-provider";
import { expenseByCategory, monthlySeries } from "@/lib/stats";
import { formatDisplayDate } from "@/lib/date";
import { formatINR } from "@/lib/format";

export default function OverviewPage() {
  const { transactions, status, error, refresh } = useTransactions();
  const [exporting, setExporting] = React.useState(false);

  const series = monthlySeries(transactions);
  const pieData = expenseByCategory(transactions)
    .slice(0, 8)
    .map((s) => ({ name: s.name, value: s.value }));

  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, 6);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handlePdfDownload = async () => {
    const area = document.getElementById("overview-pdf-area");
    if (!area || exporting) return;
    setExporting(true);
    try {
      const { captureElementToPdf, todayFilenameStamp } = await import("@/lib/pdf");
      await captureElementToPdf(
        area,
        `money-overview-${todayFilenameStamp()}.pdf`,
        [".pdf-exclude"]
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div id="overview-pdf-area" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-navy-950">
            Your money at a glance
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarDays className="h-4 w-4" />
            {today}
          </p>
        </div>
        <div className="pdf-exclude">
          <Button variant="outline" size="sm" onClick={handlePdfDownload} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Preparing PDF…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {status === "error" && transactions.length === 0 && (
        <Alert variant="error" title="Unable to load your spreadsheet data" className="pdf-exclude">
          {error} No sample data is being shown — if this persists, check the
          Apps Script URL in your environment variables.
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Retry
            </Button>
          </div>
        </Alert>
      )}

      <SummaryCards />

      <BudgetCard />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              Income vs expenses by month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <IncomeExpensesBars
                data={series.map((p) => ({
                  label: p.label,
                  income: p.income,
                  expenses: p.expenses,
                  savings: p.saved,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-slate-400" />
              Spending by category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ExpenseCategoryPie data={pieData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-slate-400" />
              Monthly savings trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <SavingsTrendArea data={series.map((p) => ({ label: p.label, savings: p.savings }))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-slate-400" />
              Recent transactions
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="pdf-exclude text-slate-500">
              <Link href="/transactions">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No transactions yet — add one to get started.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((t) => (
                  <li key={`${t.id}-${t.date}`} className="flex items-center gap-3 py-2.5">
                    <span
                      className={
                        t.type === "income"
                          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700"
                          : t.type === "savings"
                            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700"
                            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600"
                      }
                    >
                      {t.type === "income" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : t.type === "savings" ? (
                        <Banknote className="h-4 w-4" />
                      ) : (
                        <ReceiptText className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy-950">{t.category}</p>
                      <p className="truncate text-xs text-slate-400">
                        {formatDisplayDate(t.date)} · {t.paymentMethod}
                        {t.note ? ` · ${t.note}` : ""}
                      </p>
                    </div>
                    <span
                      className={
                        t.type === "income"
                          ? "text-sm font-semibold tabular-nums text-green-600"
                          : t.type === "savings"
                            ? "text-sm font-semibold tabular-nums text-blue-600"
                            : "text-sm font-semibold tabular-nums text-red-600"
                      }
                    >
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}{" "}
                      {formatINR(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}