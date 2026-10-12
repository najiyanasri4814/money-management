export type TransactionType = "income" | "expense" | "savings";

export interface Transaction {
  id: number;
  /** Canonical YYYY-MM-DD date (normalized server-side). */
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  paymentMethod: string;
  note: string;
}

/** Payload used when creating or updating a transaction (no id). */
export interface TransactionInput {
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  paymentMethod: string;
  note: string;
}

/** Row shape returned by the Apps Script JSON API. */
export interface RawTransaction {
  id?: unknown;
  date?: unknown;
  type?: unknown;
  category?: unknown;
  amount?: unknown;
  paymentMethod?: unknown;
  note?: unknown;
}

export interface TransactionsResponse {
  data: Transaction[];
  syncedAt: string;
}

/** One row in the "Budgets" spreadsheet tab (month YYYY-MM, category, amount). */
export interface BudgetRow {
  month: string;
  category: string;
  amount: number;
}

export interface HealthResponse {
  ok: boolean;
  rowCount: number;
  syncedAt: string;
  appsScriptUrl: string | null;
  lastError?: string;
}