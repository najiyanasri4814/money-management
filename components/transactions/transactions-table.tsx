"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { formatDisplayDate } from "@/lib/date";
import { formatINR } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onAdd: () => void;
}

export function TransactionsTable({
  transactions,
  loading,
  error,
  onEdit,
  onDelete,
  onAdd,
}: Props) {
  if (loading) {
    return (
      <div className="card-surface overflow-hidden">
        <div className="space-y-2 p-5">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <Alert variant="error" title="Could not load transactions">
        {error} Refresh to try again, or check that the Google Sheets API is reachable.
      </Alert>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="card-surface flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Plus className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-navy-950">No transactions found</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          {error
            ? "There was a sync problem. Refresh to retry."
            : "Add your first income or expense to start tracking your money."}
        </p>
        <Button className="mt-5" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add transaction
        </Button>
      </div>
    );
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={`${t.id}-${t.date}`}>
                <TableCell className="whitespace-nowrap text-slate-600">
                  {formatDisplayDate(t.date)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      t.type === "income"
                        ? "income"
                        : t.type === "savings"
                          ? "savings"
                          : "expense"
                    }
                  >
                    {t.type === "income"
                      ? "Income"
                      : t.type === "savings"
                        ? "Savings"
                        : "Expense"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-navy-950">{t.category}</TableCell>
                <TableCell
                  className={cn(
                    "whitespace-nowrap text-right font-semibold tabular-nums",
                    t.type === "income"
                      ? "text-green-600"
                      : t.type === "savings"
                        ? "text-blue-600"
                        : "text-red-600"
                  )}
                >
                  {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}{" "}
                  {formatINR(t.amount)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">
                  {t.paymentMethod}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-slate-500" title={t.note}>
                  {t.note || "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(t)}
                      aria-label={`Edit transaction ${t.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(t)}
                      aria-label={`Delete transaction ${t.id}`}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}