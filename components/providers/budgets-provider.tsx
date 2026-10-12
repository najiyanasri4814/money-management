"use client";

import * as React from "react";
import { getBudgets as apiGetBudgets, saveBudgets as apiSaveBudgets } from "@/lib/client-api";
import { useTransactions, type SyncStatus } from "./transactions-provider";
import {
  budgetRowsToMap,
  budgetsToRows,
  categoryBudgets,
  currentMonthKey,
  emptyBudgets,
  LOW_PCT,
  readLocalBudgets,
  totalBudgetStatus,
  writeLocalBudgets,
  type Budgets,
} from "@/lib/budgets";
import { formatINR } from "@/lib/format";

export type BudgetStorageMode = "sheet" | "local";

interface BudgetsContextValue {
  budgetsByMonth: Record<string, Budgets>;
  status: SyncStatus;
  /** "sheet" when budgets read/write the Google Sheet; "local" while falling back. */
  storageMode: BudgetStorageMode;
  /** Banner text when budgets aren't synced to the sheet yet. */
  notice: string | null;
  saving: boolean;
  refresh: () => Promise<void>;
  /** Persist one month's budgets (sheet when available, browser otherwise). */
  saveBudgets: (month: string, budgets: Budgets) => Promise<void>;
}

const BudgetsContext = React.createContext<BudgetsContextValue | null>(null);

const REDEPLOY_HINT =
  "Redeploy the Apps Script with the updated Code.gs (steps in README) and " +
  "budgets will sync to your Google Sheet automatically.";

function unsupported(message: string): boolean {
  return /unknown action/i.test(message);
}

export function BudgetsProvider({ children }: { children: React.ReactNode }) {
  const { transactions, notify } = useTransactions();
  const [budgetsByMonth, setBudgetsByMonth] = React.useState<
    Record<string, Budgets>
  >({});
  const [status, setStatus] = React.useState<SyncStatus>("loading");
  const [storageMode, setStorageMode] = React.useState<BudgetStorageMode>("sheet");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const loadedAtLeastOnce = React.useRef(false);
  const lastPct = React.useRef<Record<string, number>>({});

  const refresh = React.useCallback(async () => {
    try {
      const rows = await apiGetBudgets();
      setBudgetsByMonth(budgetRowsToMap(rows));
      setStorageMode("sheet");
      setNotice(null);
      loadedAtLeastOnce.current = true;
      setStatus("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load budgets.";
      const local = readLocalBudgets();
      setBudgetsByMonth(local);
      setStorageMode("local");
      setNotice(
        unsupported(message)
          ? `The deployed Apps Script doesn't support budget actions yet — you're seeing budgets saved in this browser. ${REDEPLOY_HINT}`
          : `Couldn't reach the budget sheet (${message}). Budgets are being kept in this browser for now.`
      );
      // Either way the page is usable — budgets live in the browser until
      // the sheet backend becomes available.
      loadedAtLeastOnce.current = true;
      setStatus("ready");
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveBudgets = React.useCallback(
    async (month: string, budgets: Budgets) => {
      setSaving(true);
      try {
        if (storageMode === "sheet") {
          try {
            await apiSaveBudgets(month, budgetsToRows(month, budgets));
            setBudgetsByMonth((prev) => ({ ...prev, [month]: budgets }));
            notify(`Budget for ${month} saved to your spreadsheet.`, "success");
            return;
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Failed to save budgets.";
            // Fall back to local storage so the user's work is never lost.
            setStorageMode("local");
            setNotice(
              unsupported(message)
                ? `The deployed Apps Script doesn't support budget actions yet — this save went to the browser instead. ${REDEPLOY_HINT}`
                : `Couldn't save to the sheet (${message}). Saved in this browser for now.`
            );
            writeLocalBudgets({ ...readLocalBudgets(), [month]: budgets });
            setBudgetsByMonth((prev) => ({ ...prev, [month]: budgets }));
            notify("Budget saved in this browser (sheet sync pending).", "info");
          }
        } else {
          writeLocalBudgets({ ...readLocalBudgets(), [month]: budgets });
          setBudgetsByMonth((prev) => ({ ...prev, [month]: budgets }));
          notify("Budget saved in this browser.", "info");
        }
      } finally {
        setSaving(false);
      }
    },
    [notify, storageMode]
  );

  // Low-budget reminders: notify once when a category or the overall budget
  // crosses the 80% / 100% marks (per session), so polling doesn't spam.
  React.useEffect(() => {
    const month = currentMonthKey();
    const budgets = budgetsByMonth[month] ?? emptyBudgets();

    for (const s of categoryBudgets(transactions, budgets, month)) {
      if (s.budgeted <= 0) continue;
      const key = `${month}:${s.category}`;
      const prev = lastPct.current[key];
      if (prev !== undefined) {
        if (prev < LOW_PCT && s.pct >= LOW_PCT && s.pct < 1) {
          notify(
            `"${s.category}" is nearly out of budget — ${formatINR(Math.max(0, s.remaining))} left.`,
            "info"
          );
        } else if (prev < 1 && s.pct >= 1) {
          notify(`"${s.category}" went over its budget this month.`, "error");
        }
      }
      lastPct.current[key] = s.pct;
    }

    const total = totalBudgetStatus(transactions, budgets, month);
    if (total && total.budgeted > 0) {
      const key = `${month}:total`;
      const prev = lastPct.current[key];
      if (prev !== undefined) {
        if (prev < LOW_PCT && total.pct >= LOW_PCT && total.pct < 1) {
          notify(
            `You've used 80% of this month's budget — ${formatINR(Math.max(0, total.remaining))} left.`,
            "info"
          );
        } else if (prev < 1 && total.pct >= 1) {
          notify("You've exceeded this month's overall budget.", "error");
        }
      }
      lastPct.current[key] = total.pct;
    }
  }, [transactions, budgetsByMonth, notify]);

  const value: BudgetsContextValue = {
    budgetsByMonth,
    status,
    storageMode,
    notice,
    saving,
    refresh,
    saveBudgets,
  };

  return (
    <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>
  );
}

export function useBudgets(): BudgetsContextValue {
  const ctx = React.useContext(BudgetsContext);
  if (!ctx) {
    throw new Error("useBudgets must be used within a BudgetsProvider.");
  }
  return ctx;
}