"use client";

import * as React from "react";
import {
  Banknote,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  PieChart as PieIcon,
  PiggyBank,
  TrendingUp,
  Wallet2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomeExpensesBars } from "@/components/charts/income-expenses-bars";
import { ExpenseCategoryPie } from "@/components/charts/expense-category-pie";
import { SavingsTrendArea } from "@/components/charts/savings-trend-area";
import { TrendLines } from "@/components/charts/trend-lines";
import { useTransactions } from "@/components/providers/transactions-provider";
import {
  dailyAverageByMonth,
  expenseByCategory,
  periodSeries,
  type BucketPoint,
  type PeriodBucket,
} from "@/lib/stats";
import { formatINR } from "@/lib/format";
import { downloadCSV, todayFilenameStamp } from "@/lib/csv";
import { cn } from "@/lib/utils";

const BUCKETS: { value: PeriodBucket; label: string }[] = [
  { value: "daily", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "quarterly", label: "Quarter" },
  { value: "yearly", label: "Year" },
];

const PERIOD_NOUN: Record<PeriodBucket, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

export default function ReportsPage() {
  const { transactions, status } = useTransactions();
  const [bucket, setBucket] = React.useState<PeriodBucket>("monthly");
  /** Index into `series`; null means "All periods". Defaults to the latest period. */
  const [periodIndex, setPeriodIndex] = React.useState<number | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const series = React.useMemo(() => periodSeries(transactions, bucket), [transactions, bucket]);

  // Keep selection on the latest period whenever the bucket or data changes.
  React.useEffect(() => {
    setPeriodIndex(series.length > 0 ? series.length - 1 : null);
  }, [bucket, series.length]);

  const activePoint = React.useMemo(() => {
    if (periodIndex === null || periodIndex < 0 || periodIndex >= series.length) return null;
    return series[periodIndex];
  }, [periodIndex, series]);

  const pieData = React.useMemo(() => {
    const slices = expenseByCategory(transactions, bucket, activePoint?.key)
      .slice(0, 8)
      .map((s) => ({ name: s.name, value: s.value }));
    return slices;
  }, [transactions, bucket, activePoint]);

  /** Averages across ALL periods of the active bucket. */
  const averages = React.useMemo(() => {
    if (series.length === 0) return null;
    const sum = (f: (p: BucketPoint) => number) => series.reduce((s, p) => s + f(p), 0);
    return {
      income: sum((p) => p.income) / series.length,
      expenses: sum((p) => p.expenses) / series.length,
      saved: sum((p) => p.saved) / series.length,
      savings: sum((p) => p.savings) / series.length,
      count: series.length,
    };
  }, [series]);

  const step = (delta: number) => {
    if (periodIndex === null) {
      setPeriodIndex(series.length - 1);
      return;
    }
    const next = periodIndex + delta;
    if (next >= 0 && next < series.length) setPeriodIndex(next);
  };

  const handlePdfDownload = async () => {
    const area = document.getElementById("reports-pdf-area");
    if (!area || exporting) return;
    setExporting(true);
    try {
      const { captureElementToPdf, todayFilenameStamp } = await import("@/lib/pdf");
      await captureElementToPdf(
        area,
        `money-report-${todayFilenameStamp()}.pdf`,
        [".pdf-exclude"] // strip toolbar/buttons from the exported PDF
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleCsvExport = () => {
    downloadCSV(
      `money-report-${todayFilenameStamp()}.csv`,
      ["Period", "Income", "Expenses", "Saved (savings-type)", "Net savings"],
      series.map((p) => [p.label, p.income, p.expenses, p.saved, p.savings])
    );
  };

  const periodNoun = PERIOD_NOUN[bucket];
  const hasData = series.length > 0;

  const statChips = activePoint
    ? [
        { label: `Income · ${activePoint.label}`, value: activePoint.income, icon: TrendingUp, cls: "text-green-600" },
        { label: `Expenses · ${activePoint.label}`, value: activePoint.expenses, icon: Wallet2, cls: "text-red-600" },
        { label: `Saved · ${activePoint.label}`, value: activePoint.saved, icon: Banknote, cls: "text-blue-600" },
        { label: `Savings · ${activePoint.label}`, value: activePoint.savings, icon: PiggyBank, cls: "text-navy-950" },
      ]
    : [];

  const avgTiles = averages
    ? [
        { label: `Avg income per ${periodNoun}`, value: averages.income, cls: "text-green-600" },
        { label: `Avg expenses per ${periodNoun}`, value: averages.expenses, cls: "text-red-600" },
        { label: `Avg saved per ${periodNoun}`, value: averages.saved, cls: "text-blue-600" },
        { label: `Avg net savings per ${periodNoun}`, value: averages.savings, cls: "text-navy-950" },
      ]
    : [];

  return (
    <div id="reports-pdf-area" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-navy-950">Reports</h2>
          <p className="mt-1 text-sm text-slate-500">
            Aggregated from the actual transactions in your spreadsheet.
          </p>
        </div>
        <div className="pdf-exclude flex flex-wrap items-center gap-3">
          <Button variant="default" size="sm" onClick={handlePdfDownload} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Preparing PDF…" : "Download PDF"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCsvExport} disabled={!hasData}>
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          {/* Period navigation: ‹ › to browse days/weeks/months/etc. */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-1.5 py-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => step(-1)}
              disabled={!hasData || (periodIndex !== null && periodIndex <= 0)}
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[92px] text-center text-sm font-semibold text-navy-950">
              {activePoint ? activePoint.label : "All periods"}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => step(1)}
              disabled={!hasData || (periodIndex !== null && periodIndex >= series.length - 1)}
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant={periodIndex === null ? "secondary" : "outline"}
            size="sm"
            onClick={() => setPeriodIndex(null)}
          >
            All periods
          </Button>
          <Tabs value={bucket} onValueChange={(v) => setBucket(v as PeriodBucket)}>
            <TabsList>
              {BUCKETS.map((b) => (
                <TabsTrigger key={b.value} value={b.value}>
                  {b.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {statChips.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statChips.map((chip) => {
            const Icon = chip.icon;
            return (
              <Card key={chip.label} className="p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon className="h-4 w-4" />
                  {chip.label}
                </div>
                <p className={cn("mt-1.5 text-xl font-bold tracking-tight", chip.cls)}>
                  {formatINR(chip.value)}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {averages && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-950">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              Averages per {periodNoun}
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {averages.count} {periodNoun}
              {averages.count === 1 ? "" : "s"} · all time
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {avgTiles.map((tile) => (
              <div key={tile.label} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {tile.label}
                </div>
                <p className={cn("mt-1 text-lg font-bold tracking-tight", tile.cls)}>
                  {formatINR(tile.value)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income versus expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <Skeleton className="h-[280px] w-full" />
            ) : series.length === 0 ? (
              <EmptyChart label="No data for this period." />
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
            <CardTitle>Income & expense trends</CardTitle>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <Skeleton className="h-[260px] w-full" />
            ) : series.length === 0 ? (
              <EmptyChart label="No data for this period." />
            ) : (
              <TrendLines
                data={series.map((p) => ({ label: p.label, income: p.income, expenses: p.expenses }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-slate-400" />
              Expense breakdown by category
              {activePoint && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {activePoint.label}
                </span>
              )}
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
            <CardTitle>Net savings trend</CardTitle>
            <p className="text-sm text-slate-500">Income minus expenses per {periodNoun}.</p>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <Skeleton className="h-[240px] w-full" />
            ) : series.length === 0 ? (
              <EmptyChart label="No data for this period." />
            ) : (
              <SavingsTrendArea
                data={series.map((p) => ({ label: p.label, net: p.savings }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily average spend</CardTitle>
          <p className="text-sm text-slate-500">
            Average daily expense within each month, a useful spending-pace signal.
          </p>
        </CardHeader>
        <CardContent>
          {status === "loading" ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <IncomeExpensesBars
              height={240}
              data={dailyAverageByMonth(transactions).map((p) => ({
                label: p.label,
                expenses: p.expenses,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-slate-400">
      {label}
    </div>
  );
}