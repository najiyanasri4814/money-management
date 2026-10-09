import "server-only";

import { normalizeDate } from "./date";
import type { RawTransaction, Transaction, TransactionInput } from "./types";
import { isTransactionType } from "./validation";

/**
 * Server-side client for the Google Apps Script Web App endpoint.
 *
 * The deployed Apps Script only implements `doGet` and communicates purely
 * through query-string parameters (POST is not supported by that deployment),
 * so every operation here is a GET request with an `action` parameter:
 *
 *   action=list    -> { success: true, data: RawTransaction[] }
 *   action=add     -> { success: true, id: number }          (auto-generated id)
 *   action=update  -> { success: true }                      (replaces the full row!)
 *   action=delete  -> { success: true }
 *
 * IMPORTANT: `update` rewrites the affected row from the supplied parameters,
 * so ALL fields must be sent on every update, or the missing ones are cleared.
 */

/**
 * Apps Script Web App endpoint.
 *
 * The URL is baked in as a default so the app works on any host (Vercel, etc.)
 * with zero environment setup. `APPS_SCRIPT_URL`, when set, overrides it.
 * This module is `server-only`, so the URL never reaches the browser.
 */
const API_URL =
  process.env.APPS_SCRIPT_URL ??
  "https://script.google.com/macros/s/AKfycbyMALcAgBfRtuIebTRkEFQ7JuxLhAcVHc1fJQEx2kSUt-vyQ8IOt2Wf3fDms4VMfCqngQ/exec";
const REQUEST_TIMEOUT_MS = 20_000;

export class AppsScriptError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "AppsScriptError";
  }
}

interface AppsScriptResponse {
  success?: boolean;
  data?: unknown;
  id?: unknown;
  error?: string;
}

async function appsScriptRequest(
  params: Record<string, string | number | undefined>,
  signal?: AbortSignal
): Promise<AppsScriptResponse> {
  if (!API_URL) {
    throw new AppsScriptError(
      "APPS_SCRIPT_URL must be set in the environment to use a custom endpoint."
    );
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  // Cache-buster: Google may cache identical GET responses; unique query keeps it fresh.
  search.set("t", String(Date.now()));

  const url = `${API_URL}?${search.toString()}`;

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  // AbortSignal.any needs Node ≥ 20.3; on older runtimes (e.g. Vercel Node 18)
  // fall back to the timeout signal alone so the request still fails fast.
  const combined =
    signal && !signal.aborted && typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: combined,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new AppsScriptError("Request to Google Sheets API timed out.");
    }
    throw new AppsScriptError(`Could not reach Google Sheets API: ${reason}`);
  }

  if (!res.ok) {
    throw new AppsScriptError(
      `Google Sheets API responded with HTTP ${res.status}.`,
      res.status
    );
  }

  let payload: AppsScriptResponse;
  try {
    payload = (await res.json()) as AppsScriptResponse;
  } catch {
    throw new AppsScriptError("Google Sheets API returned invalid JSON.");
  }

  if (payload.success !== true) {
    throw new AppsScriptError(
      payload.error ?? "Google Sheets API returned an error.",
      res.status
    );
  }

  return payload;
}

/** Map one raw sheet row to the canonical Transaction shape. */
function normalizeRow(raw: RawTransaction, index: number): Transaction {
  const amount =
    typeof raw.amount === "number"
      ? raw.amount
      : typeof raw.amount === "string"
        ? Number(raw.amount)
        : NaN;
  return {
    id:
      typeof raw.id === "number"
        ? raw.id
        : typeof raw.id === "string"
          ? Number(raw.id)
          : index,
    date: normalizeDate(raw.date),
    type: isTransactionType(raw.type) ? raw.type : "expense",
    category:
      raw.category !== undefined && raw.category !== null
        ? String(raw.category).trim() || "Other"
        : "Other",
    amount: Number.isFinite(amount) ? amount : 0,
    paymentMethod:
      raw.paymentMethod !== undefined && raw.paymentMethod !== null
        ? String(raw.paymentMethod).trim() || "Other"
        : "Other",
    note: raw.note !== undefined && raw.note !== null ? String(raw.note).trim() : "",
  };
}

export async function getTransactionsServer(
  signal?: AbortSignal
): Promise<Transaction[]> {
  const payload = await appsScriptRequest({ action: "list" }, signal);
  const raw = payload.data;
  if (!Array.isArray(raw)) {
    throw new AppsScriptError("Google Sheets API returned an unexpected list payload.");
  }
  return (raw as RawTransaction[]).map((row, i) => normalizeRow(row, i + 1));
}

export async function addTransactionServer(
  input: TransactionInput,
  signal?: AbortSignal
): Promise<Transaction> {
  const payload = await appsScriptRequest(
    {
      action: "add",
      date: input.date,
      type: input.type,
      category: input.category,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      note: input.note,
    },
    signal
  );
  const id =
    typeof payload.id === "number"
      ? payload.id
      : typeof payload.id === "string"
        ? Number(payload.id)
        : NaN;
  if (!Number.isFinite(id)) {
    throw new AppsScriptError("Google Sheets API did not return a new id.");
  }
  return { id, ...input };
}

export async function updateTransactionServer(
  id: number,
  input: TransactionInput,
  signal?: AbortSignal
): Promise<Transaction> {
  await appsScriptRequest(
    {
      action: "update",
      id,
      date: input.date,
      type: input.type,
      category: input.category,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      note: input.note,
    },
    signal
  );
  return { id, ...input };
}

export async function deleteTransactionServer(
  id: number,
  signal?: AbortSignal
): Promise<void> {
  await appsScriptRequest({ action: "delete", id }, signal);
}