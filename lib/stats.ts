import { dayKey, monthKey, parseSheetDate, quarterKey, shortDateLabel, weekKey, yearKey } from "./date";
import type { Transaction, TransactionType } from "./types";

export interface Totals {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  /** Spendable balance: income − expenses − savings. */
  balance: number;
  currentMonthIncome: number;
  currentMonthExpenses: number;
  currentMonthSavings: number;
}

export type PeriodBucket = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

function bucketOf(bucket: PeriodBucket, dateStr: string): string {
  if (bucket === "yearly") return yearKey(dateStr);
  if (bucket === "quarterly") return quarterKey(dateStr);
  if (bucket === "monthly") return monthKey(dateStr);
  if (bucket === "weekly") return weekKey(dateStr);
  return dayKey(dateStr);
}

export function computeTotals(transactions: Transaction[]): Totals {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSavings = 0;
  let currentMonthIncome = 0;
  let currentMonthExpenses = 0;

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  for (const t of transactions) {
    const amount = Number.isFinite(t.amount) ? t.amount : 0;
    if (t.type === "income") {
      totalIncome += amount;
      if (monthKey(t.date) === currentKey) currentMonthIncome += amount;
    } else if (t.type === "savings") {
      totalSavings += amount;
    } else {
      totalExpenses += amount;
      if (monthKey(t.date) === currentKey) currentMonthExpenses += amount;
    }
  }

  return {
    totalIncome,
    totalExpenses,
    totalSavings,
    balance: totalIncome - totalExpenses - totalSavings,
    currentMonthIncome,
    currentMonthExpenses,
    currentMonthSavings: currentMonthIncome - currentMonthExpenses,
  };
}

export interface MonthPoint {
  key: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  /** Sum of transactions with type "savings". */
  saved: number;
}

/** Income vs expenses (and savings) aggregated by period bucket, sorted ascending. */
export function monthlySeries(transactions: Transaction[]): MonthPoint[] {
  const map = new Map<string, MonthPoint>();

  for (const t of transactions) {
    const key = monthKey(t.date);
    if (key === "unknown") continue;
    let point = map.get(key);
    if (!point) {
      point = { key, label: key, income: 0, expenses: 0, savings: 0, saved: 0 };
      map.set(key, point);
    }
    if (t.type === "income") point.income += t.amount;
    else if (t.type === "savings") point.saved += t.amount;
    else point.expenses += t.amount;
  }

  const series = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const p of series) {
    p.savings = p.income - p.expenses;
    const d = parseSheetDate(`${p.key}-01`);
    const month = d?.toLocaleString("en-IN", { month: "short" }) ?? p.key.slice(5);
    p.label = `${month} '${p.key.slice(2, 4)}`;
  }
  return series;
}

export interface BucketPoint {
  key: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  /** Sum of transactions with type "savings". */
  saved: number;
}

/** Aggregated series for the Reports page using the selected bucket period. */
export function periodSeries(
  transactions: Transaction[],
  bucket: PeriodBucket
): BucketPoint[] {
  const map = new Map<string, BucketPoint>();

  for (const t of transactions) {
    const key = bucketOf(bucket, t.date);
    if (key === "unknown" || key === "unknown-Q") continue;
    let point = map.get(key);
    if (!point) {
      point = { key, label: key, income: 0, expenses: 0, savings: 0, saved: 0 };
      map.set(key, point);
    }
    if (t.type === "income") point.income += t.amount;
    else if (t.type === "savings") point.saved += t.amount;
    else point.expenses += t.amount;
  }

  const sortKey = (k: string) => {
    const q = k.match(/^Q(\d) (\d{4})$/);
    if (q) return `${q[2]}-${String((Number(q[1]) - 1) * 3 + 1).padStart(2, "0")}`;
    const y = k.match(/^(\d{4})$/);
    if (y) return k;
    return k;
  };

  const series = [...map.values()].sort((a, b) => sortKey(a.key).localeCompare(sortKey(b.key)));
  for (const p of series) {
    p.savings = p.income - p.expenses;
    if (bucket === "monthly") {
      const d = parseSheetDate(`${p.key}-01`);
      const month = d?.toLocaleString("en-IN", { month: "short" }) ?? p.key.slice(5);
      p.label = `${month} '${p.key.slice(2, 4)}`;
    } else if (bucket === "daily" || bucket === "weekly") {
      p.label = shortDateLabel(p.key);
    }
  }
  return series;
}

export interface CategorySlice {
  name: string;
  value: number;
  count: number;
}

/** Expense breakdown by category, sorted by value descending. */
export function expenseByCategory(
  transactions: Transaction[],
  bucket: PeriodBucket = "monthly",
  periodKey?: string
): CategorySlice[] {
  const map = new Map<string, CategorySlice>();

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (periodKey && bucketOf(bucket, t.date) !== periodKey) continue;
    const existing = map.get(t.category) ?? { name: t.category, value: 0, count: 0 };
    existing.value += t.amount;
    existing.count += 1;
    map.set(t.category, existing);
  }

  return [...map.values()].sort((a, b) => b.value - a.value);
}

/** Average daily spend per month (activity trend). */
export function dailyAverageByMonth(transactions: Transaction[]): MonthPoint[] {
  const series = monthlySeries(transactions);
  return series.map((p) => {
    const d = parseSheetDate(`${p.key}-01`);
    const daysInMonth = d ? new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() : 30;
    return { ...p, expenses: p.expenses / daysInMonth };
  });
}

export interface CategorySummary {
  name: string;
  total: number;
  count: number;
  type: TransactionType;
}

export function categorySummaries(transactions: Transaction[]): CategorySummary[] {
  const map = new Map<string, CategorySummary>();
  for (const t of transactions) {
    const existing =
      map.get(`${t.type}:${t.category}`) ?? {
        name: t.category,
        total: 0,
        count: 0,
        type: t.type,
      };
    existing.total += t.amount;
    existing.count += 1;
    map.set(`${t.type}:${t.category}`, existing);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}