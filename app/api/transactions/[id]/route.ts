import { NextRequest, NextResponse } from "next/server";
import {
  AppsScriptError,
  updateTransactionServer,
  deleteTransactionServer,
} from "@/lib/api";
import { validateTransactionInput } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function assertAuthorized(req: NextRequest): NextResponse | null {
  const token = process.env.API_ACCESS_TOKEN;
  if (!token) return null;
  const header = req.headers.get("authorization") ?? req.headers.get("x-access-token") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : header;
  return presented === token ? null : NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = assertAuthorized(req);
  if (denied) return denied;

  const id = parseId(params.id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });
  }

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
    const tx = await updateTransactionServer(id, {
      date: input.date as string,
      type: input.type as "income" | "expense",
      category: (input.category as string).trim(),
      amount: Number(input.amount),
      paymentMethod: (input.paymentMethod as string).trim(),
      note: (input.note as string ?? "").trim(),
    }, req.signal);
    return NextResponse.json({ data: tx });
  } catch (err) {
    const message =
      err instanceof AppsScriptError ? err.message : "Failed to update transaction.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = assertAuthorized(req);
  if (denied) return denied;

  const id = parseId(params.id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });
  }

  try {
    await deleteTransactionServer(id, req.signal);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof AppsScriptError ? err.message : "Failed to delete transaction.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}