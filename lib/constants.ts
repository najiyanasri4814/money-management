import type { TransactionType } from "./types";

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Rent",
  "Entertainment",
  "Healthcare",
  "Other",
];

export const DEFAULT_INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Other",
];

export const DEFAULT_SAVINGS_CATEGORIES = [
  "Savings Account",
  "Fixed Deposit",
  "Recurring Deposit",
  "Mutual Fund",
  "Emergency Fund",
  "Other",
];

export const DEFAULT_PAYMENT_METHODS = [
  "UPI",
  "Cash",
  "Bank Transfer",
  "Credit Card",
  "Debit Card",
  "Other",
];

export const STORAGE_KEYS = {
  customCategories: "mm.customCategories",
  customPaymentMethods: "mm.customPaymentMethods",
  autoRefresh: "mm.autoRefresh",
  reportPeriod: "mm.reportPeriod",
} as const;

export function getCustomCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.customCategories);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function getCustomPaymentMethods(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.customPaymentMethods);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function saveCustomCategories(items: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.customCategories, JSON.stringify(items));
}

export function saveCustomPaymentMethods(items: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.customPaymentMethods, JSON.stringify(items));
}

/** All categories (defaults + user custom), deduplicated, preserving order. */
export function allCategories(): string[] {
  const defaults = [
    ...DEFAULT_INCOME_CATEGORIES,
    ...DEFAULT_SAVINGS_CATEGORIES,
    ...DEFAULT_EXPENSE_CATEGORIES,
  ];
  return [...new Set([...defaults, ...getCustomCategories()])];
}

export function allPaymentMethods(): string[] {
  return [...new Set([...DEFAULT_PAYMENT_METHODS, ...getCustomPaymentMethods()])];
}

/** Categories relevant for a specific transaction type. */
export function categoriesForType(type: TransactionType): string[] {
  let typeDefaults: string[];
  if (type === "income") typeDefaults = DEFAULT_INCOME_CATEGORIES;
  else if (type === "savings") typeDefaults = DEFAULT_SAVINGS_CATEGORIES;
  else typeDefaults = DEFAULT_EXPENSE_CATEGORIES;
  return [...new Set([...typeDefaults, ...getCustomCategories()])];
}