"use client";

import type { BudgetRow, HealthResponse, Transaction, TransactionInput } from "@/lib/types";

/**
 * Client-side API layer. All calls go through Next.js route handlers
 * (app/api/transactions), which act as a server-side proxy to Google Apps
 * Script. This keeps the Apps Script URL server-side and avoids browser CORS
 * issues with Google's redirect responses.
 */

async function request<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch (err) {
    throw new Error(
      `Network error while contacting the server: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!res.ok) {
    let message = `Request failed with HTTP ${res.status}.`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // ignore parse failures, keep the generic message
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export interface CreateResponse {
  data: Transaction;
}
export interface UpdateResponse {
  data: Transaction;
}
export interface DeleteResponse {
  success: boolean;
}

export async function getTransactions(): Promise<Transaction[]> {
  const res = await request<{ data: Transaction[] }>("/api/transactions");
  return res.data;
}

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  const res = await request<CreateResponse>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateTransaction(
  id: number,
  input: TransactionInput
): Promise<Transaction> {
  const res = await request<UpdateResponse>(`/api/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteTransaction(id: number): Promise<void> {
  await request<DeleteResponse>(`/api/transactions/${id}`, { method: "DELETE" });
}

export async function getBudgets(): Promise<BudgetRow[]> {
  const res = await request<{ data: BudgetRow[] }>("/api/budgets");
  return res.data;
}

export interface BudgetsStatus {
  connected: boolean;
  rowCount: number;
  message?: string;
}

/**
 * Probe the budgets backend without throwing — returns the raw Google message
 * (e.g. "unknown action: listBudgets") when the deployment hasn't been
 * updated yet, which makes the Settings diagnostics self-explanatory.
 */
export async function fetchBudgetsStatus(): Promise<BudgetsStatus> {
  try {
    const res = await request<{ data: BudgetRow[] }>("/api/budgets");
    return { connected: true, rowCount: res.data.length };
  } catch (err) {
    return {
      connected: false,
      rowCount: 0,
      message: err instanceof Error ? err.message : "Failed to reach the budgets API.",
    };
  }
}

export async function saveBudgets(
  month: string,
  rows: { category: string; amount: number }[]
): Promise<void> {
  await request<{ success: boolean }>("/api/budgets", {
    method: "PUT",
    body: JSON.stringify({ month, rows }),
  });
}

export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/transactions/health");
}