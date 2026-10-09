import { NextRequest, NextResponse } from "next/server";
import { AppsScriptError, getTransactionsServer } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const data = await getTransactionsServer(req.signal);
    return NextResponse.json({
      ok: true,
      rowCount: data.length,
      syncedAt: new Date().toISOString(),
      configured: Boolean(process.env.APPS_SCRIPT_URL),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        rowCount: 0,
        syncedAt: null,
        configured: Boolean(process.env.APPS_SCRIPT_URL),
        lastError: err instanceof AppsScriptError ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}