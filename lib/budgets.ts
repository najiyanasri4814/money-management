import { DEFAULT_EXPENSE_CATEGORIES, getCustomCategories, STORAGE_KEYS } from "./constants";
import { monthKey } from "./date";
import type { BudgetRow, Transaction } from "./types";

/**
 * Monthly budget model.
 *
 * A budget belongs to a month (YYYY-MM) and consists of an optional overall
 * budget (`total`, stored with category name "total") plus per-expense-category
 * budgets (`categories`). Spending is compared against the budget for the
 * current month only.
 */

/** A budget is "low" once this fraction of it has been spent. */
export const LOW_PCT = 0.8;

export interface Budgets {
  /** Overall monthly budget; 0 = not set. */
  total: number;
  /** Per-category monthly budget: category -> amount. */
  categories: Record<string, number>;
}

export type BudgetStatus = "ok" | "low" | "exceeded";

export interface CategoryBudget {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  /** spent / budgeted (0..∞); ≥1 means over budget. */
  pct: number;
  status: BudgetStatus;
}

export interface TotalBudgetStatus {
  budgeted: number;
  spent: number;
  remaining: number;
  pct: number;
  status: BudgetStatus;
}

/** The overall-budget placeholder used in the "Budgets" sheet. */
export const TOTAL_CATEGORY = "total";

export function emptyBudgets(): Budgets {
  return { total: 0, categories: {} };
}

/** "YYYY-MM" for the month containing `date` (defaults to now). */
export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Parse a user-typed amount ("12,500" / "12500" / "") into a positive number or 0. */
export function parseAmountInput(value: string): number {
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Convert flat sheet rows into a month-keyed map of Budgets. */
export function budgetRowsToMap(rows: BudgetRow[]): Record<string, Budgets> {
  const map: Record<string, Budgets> = {};
  for (const row of rows) {
    if (!row) continue;
    const month = String(row.month ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount < 0) continue;
    const category = String(row.category ?? "").trim();
    if (!category) continue;
    const entry = map[month] ?? emptyBudgets();
    if (category === TOTAL_CATEGORY) entry.total = amount;
    else entry.categories[category] = amount;
    map[month] = entry;
  }
  return map;
}

/** Convert a month's Budgets back into flat sheet rows (0 amounts dropped). */
export function budgetsToRows(month: string, budgets: Budgets): BudgetRow[] {
  const rows: BudgetRow[] = [];
  if (budgets.total > 0) rows.push({ month, category: TOTAL_CATEGORY, amount: budgets.total });
  for (const [category, amount] of Object.entries(budgets.categories)) {
    if (category && amount > 0) rows.push({ month, category, amount });
  }
  return rows;
}

/** Expense totals by category for a month (expense-type only). */
export function spentByCategory(
  transactions: Transaction[],
  month: string
): Record<string, number> {
  const spent: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (monthKey(t.date) !== month) continue;
    spent[t.category] =
      (spent[t.category] ?? 0) + (Number.isFinite(t.amount) ? t.amount : 0);
  }
  return spent;
}

/** Total expense-type spending in a month. */
export function totalSpent(transactions: Transaction[], month: string): number {
  let total = 0;
  for (const t of transactions) {
    if (t.type !== "expense" || monthKey(t.date) !== month) continue;
    total += Number.isFinite(t.amount) ? t.amount : 0;
  }
  return total;
}

function statusOf(pct: number): BudgetStatus {
  if (pct >= 1) return "exceeded";
  if (pct >= LOW_PCT) return "low";
  return "ok";
}

/** Per-category progress against the budgets, worst first. */
export function categoryBudgets(
  transactions: Transaction[],
  budgets: Budgets,
  month: string
): CategoryBudget[] {
  const spent = spentByCategory(transactions, month);
  const rows: CategoryBudget[] = [];
  for (const [category, budgeted] of Object.entries(budgets.categories)) {
    if (!category || budgeted <= 0) continue;
    const s = spent[category] ?? 0;
    const pct = s / budgeted;
    rows.push({
      category,
      budgeted,
      spent: s,
      remaining: budgeted - s,
      pct,
      status: statusOf(pct),
    });
  }
  return rows.sort((a, b) => b.pct - a.pct);
}

/** Overall progress against the total monthly budget, or null when unset. */
export function totalBudgetStatus(
  transactions: Transaction[],
  budgets: Budgets,
  month: string
): TotalBudgetStatus | null {
  if (!budgets || budgets.total <= 0) return null;
  const spent = totalSpent(transactions, month);
  const pct = spent / budgets.total;
  return {
    budgeted: budgets.total,
    spent,
    remaining: budgets.total - spent,
    pct,
    status: statusOf(pct),
  };
}

/**
 * Category names worth budgeting for a month: default expense categories,
 * categories actually used that month, custom categories, and any already
 * budgeted ones — deduplicated and sorted.
 */
export function budgetableCategories(
  transactions: Transaction[],
  budgets: Budgets | undefined,
  month: string
): string[] {
  const set = new Set<string>(DEFAULT_EXPENSE_CATEGORIES);
  for (const t of transactions) {
    if (t.type === "expense" && monthKey(t.date) === month) set.add(t.category);
  }
  for (const c of getCustomCategories()) set.add(c);
  for (const c of Object.keys(budgets?.categories ?? {})) set.add(c);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/* ------------------------------------------------------------------ */
/* Browser fallback storage (used until the Apps Script is redeployed) */
/* ------------------------------------------------------------------ */

export function readLocalBudgets(): Record<string, Budgets> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.budgetsLocal);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<Budgets>>;
    const out: Record<string, Budgets> = {};
    for (const [month, b] of Object.entries(parsed ?? {})) {
      const catRaw = b?.categories;
      const categories: Record<string, number> = {};
      if (catRaw && typeof catRaw === "object") {
        for (const [k, v] of Object.entries(catRaw)) {
          const n = Number(v);
          if (Number.isFinite(n) && n > 0) categories[k] = n;
        }
      }
      const total = Number(b?.total);
      out[month] = {
        total: Number.isFinite(total) && total > 0 ? total : 0,
        categories,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function writeLocalBudgets(map: Record<string, Budgets>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.budgetsLocal, JSON.stringify(map));
  } catch {
    // storage unavailable — ignore
  }
}