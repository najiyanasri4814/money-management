import { NextRequest, NextResponse } from "next/server";
import {
  AppsScriptError,
  listBudgetsServer,
  saveBudgetsServer,
} from "@/lib/api";
import type { BudgetRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Optional bearer-token gate. Enabled only when API_ACCESS_TOKEN is set. */
function assertAuthorized(req: NextRequest): NextResponse | null {
  const token = process.env.API_ACCESS_TOKEN;
  if (!token) return null;
  const header = req.headers.get("authorization") ?? req.headers.get("x-access-token") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (presented !== token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = assertAuthorized(req);
  if (denied) return denied;

  try {
    const data = await listBudgetsServer(req.signal);
    return NextResponse.json({ data, syncedAt: new Date().toISOString() });
  } catch (err) {
    const message =
      err instanceof AppsScriptError ? err.message : "Failed to load budgets.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = assertAuthorized(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const month = typeof input.month === "string" ? input.month.trim() : "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM." }, { status: 400 });
  }
  if (!Array.isArray(input.rows)) {
    return NextResponse.json({ error: "rows must be an array." }, { status: 400 });
  }

  // Dedupe by category (last wins) and drop invalid rows.
  const seen = new Map<string, number>();
  for (const item of input.rows as unknown[]) {
    const row = (item ?? {}) as Record<string, unknown>;
    const category = typeof row.category === "string" ? row.category.trim() : "";
    if (!category || category.length > 60) continue;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (seen.size < 100) seen.set(category, amount);
  }
  const rows: BudgetRow[] = [...seen].map(([category, amount]) => ({
    month,
    category,
    amount,
  }));

  try {
    await saveBudgetsServer(month, rows, req.signal);
    return NextResponse.json({ success: true, count: rows.length });
  } catch (err) {
    const message =
      err instanceof AppsScriptError ? err.message : "Failed to save budgets.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}