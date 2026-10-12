"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  PieChart as PieIcon,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BudgetCard } from "@/components/dashboard/budget-card";
import { IncomeExpensesBars } from "@/components/charts/income-expenses-bars";
import { ExpenseCategoryPie, groupSlices } from "@/components/charts/expense-category-pie";
import { SavingsTrendArea } from "@/components/charts/savings-trend-area";
import { CATEGORY_PALETTE } from "@/components/charts/chart-common";
import { useTransactions } from "@/components/providers/transactions-provider";
import { expenseByCategory, monthlySeries } from "@/lib/stats";
import { formatDisplayDate, monthKey, monthLongLabel } from "@/lib/date";
import { formatINR } from "@/lib/format";

const RECENT_COUNT = 5;

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function OverviewPage() {
  const { transactions, status, error, refresh } = useTransactions();
  const [month, setMonth] = React.useState("");
  const [exporting, setExporting] = React.useState(false);

  // Default to the current month once mounted (hydrates with the same state both sides).
  React.useEffect(() => {
    if (!month) {
      const now = new Date();
      setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    }
  }, [month]);

  const monthReady = month.length > 0;
  const monthTx = monthReady ? transactions.filter((t) => monthKey(t.date) === month) : [];
  const monthLabel = monthLongLabel(month);

  // Time-series charts are full history — they answer "how does my money change over time".
  const series = monthlySeries(transactions);

  // Month-scoped breakdown: expenses only, sorted highest to lowest.
  const pieSlices = monthReady ? expenseByCategory(transactions, "monthly", month) : [];
  const pieData = pieSlices.map((s) => ({ name: s.name, value: s.value }));
  const slices = groupSlices(pieData);
  const monthExpenseTotal = pieSlices.reduce((sum, s) => sum + s.value, 0);

  const recent = [...monthTx]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, RECENT_COUNT);

  const failedFirstLoad = status === "error" && transactions.length === 0;
  const loading = status === "loading" || !monthReady;

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
          <p className="mt-1 text-sm text-slate-500">
            {monthLabel || "Loading month…"} — income, spending and how your money
            changed this month.
          </p>
        </div>
        <div className="pdf-exclude flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth(shiftMonth(month, -1))}
              disabled={!monthReady}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-44"
              aria-label="Report month"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={!monthReady}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
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

      {failedFirstLoad && (
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

      <SummaryCards month={month} />

      <BudgetCard month={month || undefined} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              Income vs expenses by month
            </CardTitle>
            <CardDescription>
              Income and expenses compared month by month across all your records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <IncomeExpensesBars
                data={series.map((p) => ({
                  label: p.label,
                  income: p.income,
                  expenses: p.expenses,
                  savings: p.saved,
                }))}
                emptyText="No transactions yet — add one to get started."
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
            <CardDescription>
              Expenses in {monthLabel || "…"} — where your money went.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <>
                <ExpenseCategoryPie
                  data={pieData}
                  showLegend={false}
                  emptyText={`No spending in ${monthLabel} yet.`}
                />
                {slices.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {slices.map((s, i) => {
                      const pct = monthExpenseTotal > 0 ? (s.value / monthExpenseTotal) * 100 : 0;
                      return (
                        <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2 text-slate-500">
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
                              }}
                            />
                            <span className="truncate">{s.name}</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-navy-950">
                            {formatINR(s.value)}
                            <span className="ml-2 text-xs text-slate-400">{Math.round(pct)}%</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="sr-only">
                  {slices.length > 0
                    ? `Spending in ${monthLabel}: ${slices
                        .map((s) => `${s.name} ${formatINR(s.value)}`)
                        .join(", ")}.`
                    : `No expenses recorded in ${monthLabel}.`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-slate-400" />
              Net cash flow by month
            </CardTitle>
            <CardDescription>
              Income minus expenses each month. Money set aside as savings shows as a
              dashed line.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <SavingsTrendArea
                data={series.map((p) => ({ label: p.label, net: p.savings, saved: p.saved }))}
                emptyText="No transactions yet — add one to get started."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-slate-400" />
                Recent transactions
              </CardTitle>
              <CardDescription>{monthLabel || "…"}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="pdf-exclude text-slate-500">
              <Link href="/transactions">
                View all transactions
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: RECENT_COUNT }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No transactions in {monthLabel}. Add one on the{" "}
                <Link href="/transactions" className="font-medium text-navy-950 underline">
                  Transactions
                </Link>{" "}
                page or pick another month.
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
                        <span className="font-medium capitalize text-slate-500">{t.type}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        {formatDisplayDate(t.date)}
                        {t.paymentMethod ? (
                          <>
                            <span className="mx-1.5 text-slate-300">·</span>
                            {t.paymentMethod}
                          </>
                        ) : null}
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