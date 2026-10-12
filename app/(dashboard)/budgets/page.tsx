"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Plus,
  Save,
  Target,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BudgetMeter } from "@/components/budgets/budget-meter";
import { useBudgets } from "@/components/providers/budgets-provider";
import { useTransactions } from "@/components/providers/transactions-provider";
import {
  budgetableCategories,
  categoryBudgets,
  currentMonthKey,
  emptyBudgets,
  parseAmountInput,
  spentByCategory,
  totalBudgetStatus,
  type Budgets,
} from "@/lib/budgets";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Draft {
  total: string;
  categories: Record<string, string>;
}

function statusLabel(status: string, remaining: number): string {
  if (status === "exceeded") return `Over by ${formatINR(-remaining)}`;
  if (status === "low") return `Low — ${formatINR(remaining)} left`;
  return "On track";
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetsPage() {
  const {
    budgetsByMonth,
    status,
    notice,
    localBudgets,
    saving,
    saveBudgets,
    refresh,
    transferLocalBudgets,
  } = useBudgets();
  const { transactions, status: txStatus } = useTransactions();

  const [month, setMonth] = React.useState<string>("");
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [newCategory, setNewCategory] = React.useState("");
  const [transferring, setTransferring] = React.useState(false);
  const [rechecking, setRechecking] = React.useState(false);

  const localMonthCount = Object.keys(localBudgets).length;

  const handleTransfer = async () => {
    if (transferring) return;
    setTransferring(true);
    try {
      await transferLocalBudgets();
    } catch (err) {
      window.alert(
        `Couldn't copy budgets to the sheet yet: ${
          err instanceof Error ? err.message : String(err)
        }. Nothing was removed from this browser.`
      );
    } finally {
      setTransferring(false);
    }
  };

  const handleRecheck = async () => {
    if (rechecking) return;
    setRechecking(true);
    try {
      await refresh();
    } finally {
      setRechecking(false);
    }
  };

  React.useEffect(() => {
    setMonth(currentMonthKey());
  }, []);

  const budgets = month ? (budgetsByMonth[month] ?? emptyBudgets()) : emptyBudgets();

  const baseCategories = React.useMemo(
    () => (month ? budgetableCategories(transactions, budgets, month) : []),
    [transactions, budgets, month]
  );

  const categoryNames = React.useMemo(() => {
    const set = new Set(baseCategories);
    for (const c of Object.keys(draft?.categories ?? {})) set.add(c);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [baseCategories, draft?.categories]);

  // Initialize the edit draft whenever the month or saved data changes.
  React.useEffect(() => {
    if (!month || status === "loading") return;
    setDraft({
      total: budgets.total > 0 ? String(budgets.total) : "",
      categories: Object.fromEntries(
        baseCategories.map((c) => [
          c,
          budgets.categories[c] > 0 ? String(budgets.categories[c]) : "",
        ])
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, budgetsByMonth, status]);

  const draftBudgets: Budgets = React.useMemo(() => {
    if (!draft) return budgets;
    const categories: Record<string, number> = {};
    for (const [c, v] of Object.entries(draft.categories)) {
      const n = parseAmountInput(v);
      if (n > 0) categories[c] = n;
    }
    return { total: parseAmountInput(draft.total), categories };
  }, [draft, budgets]);

  const dirty = React.useMemo(() => {
    if (!draft) return false;
    return (
      draft.total !== (budgets.total > 0 ? String(budgets.total) : "") ||
      categoryNames.some(
        (c) =>
          (draft.categories[c] ?? "") !==
          (budgets.categories[c] > 0 ? String(budgets.categories[c]) : "")
      )
    );
  }, [draft, budgets, categoryNames]);

  const spent = React.useMemo(
    () => (month ? spentByCategory(transactions, month) : {}),
    [transactions, month]
  );
  const total = React.useMemo(
    () => totalBudgetStatus(transactions, draftBudgets, month ?? ""),
    [transactions, draftBudgets, month]
  );
  const perCategory = React.useMemo(
    () => categoryBudgets(transactions, draftBudgets, month ?? "").sort((a, b) => a.category.localeCompare(b.category)),
    [transactions, draftBudgets, month]
  );
  const perCategoryMap = React.useMemo(
    () => new Map(perCategory.map((c) => [c.category, c])),
    [perCategory]
  );

  const setCategoryValue = (category: string, value: string) => {
    setDraft((d) =>
      d ? { ...d, categories: { ...d.categories, [category]: value } } : d
    );
  };

  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    setDraft((d) =>
      d ? { ...d, categories: { ...d.categories, [name]: "" } } : d
    );
    setNewCategory("");
  };

  const changeMonth = (next: string) => {
    if (!next) return;
    if (dirty && !window.confirm("Discard unsaved budget changes?")) return;
    setMonth(next);
  };

  const handleSave = async () => {
    if (!month || !draft || saving) return;
    try {
      await saveBudgets(month, draftBudgets);
    } catch {
      // provider surfaces the error via toast
    }
  };

  const monthLabelText = month
    ? new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1).toLocaleString(
        "en-IN",
        { month: "long", year: "numeric" }
      )
    : "";

  if (status === "loading" || txStatus === "loading" || !month || !draft) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-52" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-navy-950">
            Monthly budgets
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarDays className="h-4 w-4" />
            {monthLabelText} · {formatINR(total?.spent ?? 0)} spent on expenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth(shiftMonth(month, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="month"
            value={month}
            onChange={(e) => changeMonth(e.target.value)}
            className="w-40"
            aria-label="Budget month"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth(shiftMonth(month, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {notice && (
        <Alert variant="warning" title="Budgets are saved in this browser for now">
          {notice}
          <details className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">
              How to sync budgets to your Google Sheet
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Open the Apps Script project behind your spreadsheet.</li>
              <li>
                Replace <code>Code.gs</code> with the updated version in{" "}
                <code>apps-script/Code.gs</code> (it adds the listBudgets /
                saveBudgets actions).
              </li>
              <li>
                Deploy → Manage deployments → edit the Web App → Version: “New
                version” → Deploy (the URL stays the same).
              </li>
              <li>Refresh this page — budgets will now live in the sheet.</li>
            </ol>
          </details>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRecheck()}
              disabled={rechecking}
            >
              {rechecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              {rechecking ? "Checking…" : "I've redeployed — re-check"}
            </Button>
          </div>
        </Alert>
      )}

      {!notice && localMonthCount > 0 && (
        <Alert variant="info" title="Budgets found in this browser">
          You have {localMonthCount} month
          {localMonthCount === 1 ? "" : "s"} of budgets saved in this browser
          (from before the sheet connection). Copy them into your spreadsheet so
          they sync everywhere:
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleTransfer()}
              disabled={transferring}
            >
              {transferring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {transferring ? "Copying…" : "Copy to spreadsheet"}
            </Button>
          </div>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-400" />
            Overall monthly budget
          </CardTitle>
          {total && (
            <Badge
              className={
                total.status === "exceeded"
                  ? "bg-red-100 text-red-700"
                  : total.status === "low"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
              }
            >
              {statusLabel(total.status, total.remaining)}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex max-w-xs items-center gap-2">
            <span className="text-sm font-medium text-slate-500">₹</span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 25000"
              value={draft.total}
              onChange={(e) => setDraft({ ...draft, total: e.target.value })}
            />
          </div>
          {total ? (
            <>
              <BudgetMeter pct={total.pct} status={total.status} />
              <p className="text-sm tabular-nums text-slate-500">
                {formatINR(total.spent)} of {formatINR(total.budgeted)} used ·{" "}
                <span
                  className={cn(
                    "font-semibold",
                    total.status === "exceeded"
                      ? "text-red-600"
                      : total.status === "low"
                        ? "text-amber-600"
                        : "text-green-600"
                  )}
                >
                  {total.status === "exceeded"
                    ? `over by ${formatINR(-total.remaining)}`
                    : `${formatINR(total.remaining)} remaining`}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Set one overall limit for the month — e.g. everything except
              savings.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-400" />
            Budget by main category
          </CardTitle>
          {dirty && <Badge className="bg-amber-100 text-amber-700">Unsaved changes</Badge>}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1.2fr_2fr] gap-3 px-1 pb-1 text-xs font-medium uppercase tracking-wide text-slate-400 sm:grid">
            <span>Category</span>
            <span>Spent</span>
            <span>Budget</span>
            <span>Remaining</span>
            <span className="text-right">Progress</span>
          </div>

          {categoryNames.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Add a category below to start budgeting.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {categoryNames.map((category) => {
                const info = perCategoryMap.get(category);
                const spentValue = spent[category] ?? 0;
                const budgeted = info?.budgeted ?? parseAmountInput(draft.categories[category] ?? "");
                const remaining = budgeted - spentValue;
                const statusText =
                  budgeted > 0
                    ? statusLabel(info?.status ?? "ok", remaining)
                    : spentValue > 0
                      ? `${formatINR(spentValue)} spent, no budget set`
                      : "Not budgeted";
                return (
                  <li
                    key={category}
                    className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[1.4fr_1fr_1fr_1.2fr_2fr] sm:items-center sm:gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-navy-950">{category}</p>
                      {budgeted > 0 && (
                        <Badge
                          className={cn(
                            "mt-1",
                            info?.status === "exceeded"
                              ? "bg-red-100 text-red-700"
                              : info?.status === "low"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                          )}
                        >
                          {statusText}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm tabular-nums text-red-600/90">
                      {spentValue > 0 ? formatINR(spentValue) : "—"}
                    </p>
                    <div className="flex max-w-[140px] items-center gap-1.5">
                      <span className="text-sm text-slate-400">₹</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={draft.categories[category] ?? ""}
                        onChange={(e) => setCategoryValue(category, e.target.value)}
                        aria-label={`Budget for ${category}`}
                      />
                    </div>
                    <p className="text-sm tabular-nums text-slate-500">
                      {budgeted > 0 ? formatINR(remaining < 0 ? 0 : remaining) : "—"}
                    </p>
                    <div className="flex items-center gap-2">
                      <BudgetMeter
                        pct={budgeted > 0 ? spentValue / budgeted : 0}
                        status={info?.status ?? "ok"}
                        className="flex-1"
                      />
                      <span className="w-10 text-right text-xs tabular-nums text-slate-400">
                        {budgeted > 0
                          ? `${Math.min(999, Math.round((spentValue / budgeted) * 100))}%`
                          : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
            <Input
              type="text"
              placeholder="Budget another category…"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={handleAddCategory}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <Button onClick={() => void handleSave()} disabled={saving || !dirty}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : dirty ? "Save budgets" : "Saved"}
            </Button>
            {!dirty && (
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Info className="h-3.5 w-3.5" />
                {budgets.total > 0 || Object.keys(budgets.categories).length > 0
                  ? `Budgets for ${month} are saved.`
                  : "Nothing saved for this month yet."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {perCategory.some((c) => c.status !== "ok") && (
        <Alert variant="warning" title="Some budgets are running low">
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {perCategory
              .filter((c) => c.status !== "ok")
              .map((c) => (
                <li key={c.category}>
                  <span className="font-medium">{c.category}</span>:{" "}
                  {c.status === "exceeded"
                    ? `over its budget by ${formatINR(-c.remaining)}`
                    : `${formatINR(c.remaining)} left (${Math.round(c.pct * 100)}% spent)`}
                </li>
              ))}
          </ul>
        </Alert>
      )}

      <p className="flex items-start gap-1.5 text-xs text-slate-400">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        You&apos;ll get a reminder when any budget crosses 80% spent, and again
        when it&apos;s exceeded. Savings transactions don&apos;t count as
        spending.
      </p>
    </div>
  );
}