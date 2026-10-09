"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDisplayDate } from "@/lib/date";
import { formatINR } from "@/lib/format";
import type { Transaction } from "@/lib/types";

interface Props {
  target: Transaction | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (t: Transaction) => Promise<void>;
}

export function DeleteTransactionDialog({ target, onOpenChange, onConfirm }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (target === null) {
      setBusy(false);
      setError(null);
    }
  }, [target]);

  const handleConfirm = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(target);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <TriangleAlert className="h-[18px] w-[18px]" />
            </span>
            <DialogTitle>Delete transaction?</DialogTitle>
          </div>
          <DialogDescription>
            This permanently removes the row from your Google Spreadsheet. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-navy-950">{target.category}</span>
              <span
                className={
                  target.type === "income"
                    ? "font-semibold text-green-600"
                    : target.type === "savings"
                      ? "font-semibold text-blue-600"
                      : "font-semibold text-red-600"
                }
              >
                {target.type === "income"
                  ? "+"
                  : target.type === "expense"
                    ? "−"
                    : ""}{" "}
                {formatINR(target.amount)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {formatDisplayDate(target.date)}
              {target.paymentMethod ? ` · ${target.paymentMethod}` : ""}
              {target.note ? ` · ${target.note}` : ""}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            loading={busy}
            loadingText="Deleting…"
          >
            Delete transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}