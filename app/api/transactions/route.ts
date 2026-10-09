import { NextRequest, NextResponse } from "next/server";
import {
  AppsScriptError,
  getTransactionsServer,
  addTransactionServer,
} from "@/lib/api";
import { validateTransactionInput } from "@/lib/validation";

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
    const data = await getTransactionsServer(req.signal);
    return NextResponse.json({ data, syncedAt: new Date().toISOString() });
  } catch (err) {
    const message =
      err instanceof AppsScriptError ? err.message : "Failed to load transactions.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const denied = assertAuthorized(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const validation = validateTransactionInput(input);
  if (!validation.ok) {
    return NextResponse.json({ error: "Validation failed.", errors: validation.errors }, { status: 400 });
  }

  try {
    const tx = await addTransactionServer({
      date: input.date as string,
      type: input.type as "income" | "expense",
      category: (input.category as string).trim(),
      amount: Number(input.amount),
      paymentMethod: (input.paymentMethod as string).trim(),
      note: (input.note as string ?? "").trim(),
    }, req.signal);
    return NextResponse.json({ data: tx }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof AppsScriptError ? err.message : "Failed to add transaction.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}