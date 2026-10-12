"use client";

import { usePathname } from "next/navigation";
import { CheckCircle2, Cloud, Loader2, Menu, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/format";
import { useTransactions } from "@/components/providers/transactions-provider";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/transactions": "Transactions",
  "/reports": "Reports",
  "/budgets": "Budgets",
  "/settings": "Settings",
};

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { refreshing, lastSync, status, error, refresh } = useTransactions();
  const title = TITLES[pathname] ?? "Money Management";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-lg font-semibold tracking-tight text-navy-950">{title}</h1>

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          <SyncStatus
            refreshing={refreshing}
            lastSync={lastSync}
            status={status}
            error={error}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            loading={refreshing}
            loadingText="Syncing"
            aria-label="Refresh data from Google Sheets"
          >
            <RefreshCw />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function SyncStatus({
  refreshing,
  lastSync,
  status,
  error,
}: {
  refreshing: boolean;
  lastSync: Date | null;
  status: string;
  error: string | null;
}) {
  if (refreshing) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Syncing…
      </span>
    );
  }

  if (status === "error" && error) {
    return (
      <span
        className="hidden items-center gap-1.5 text-xs text-red-600 sm:flex"
        title={error}
      >
        <TriangleAlert className="h-3.5 w-3.5" />
        Sync error
      </span>
    );
  }

  if (lastSync) {
    return (
      <span
        className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex"
        title={`Last successful sync with Google Sheets: ${lastSync.toLocaleString("en-IN")}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        Synced {formatTime(lastSync)}
      </span>
    );
  }

  return (
    <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
      <Cloud className="h-3.5 w-3.5" />
      Not synced yet
    </span>
  );
}