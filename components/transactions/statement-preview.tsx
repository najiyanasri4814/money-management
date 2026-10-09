"use client";

import { X } from "lucide-react";
import type { Ref } from "react";
import type { Transaction } from "@/lib/types";
import type { FilterState } from "./transactions-filters";
import { formatDisplayDate } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  transactions: Transaction[];
  filters: FilterState;
  innerRef?: Ref<HTMLDivElement>;
  onClose: () => void;
}

/**
 * Full statement view rendered off-viewport while the PDF export captures it.
 * Includes EVERY filtered transaction (no pagination) with a totals strip.
 */
export function StatementPreview({ transactions, filters, innerRef, onClose }: Props) {
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amount;
      else if (t.type === "expense") acc.expenses += t.amount;
      else acc.savings += t.amount;
      return acc;
    },
    { income: 0, expenses: 0, savings: 0, balance: 0 }
  );
  totals.balance = totals.income - totals.expenses - totals.savings;

  const filterLabel =
    [
      filters.type !== "all" ? `Type: ${filters.type}` : null,
      filters.category !== "all" ? `Category: ${filters.category}` : null,
      filters.search.trim() ? `Search: "${filters.search.trim()}"` : null,
    ]
      .filter(Boolean)
      .join("  ·  ") || "All transactions";

  const generated = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-white">
      <div ref={innerRef} className="mx-auto w-[794px] bg-white p-10 text-navy-950">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close statement preview"
          className="pdf-exclude absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b-2 border-navy-900 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Money Statement</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generated {generated} · {filterLabel}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          <StatementTile label="Income" value={totals.income} cls="text-green-600" />
          <StatementTile label="Expenses" value={totals.expenses} cls="text-red-600" />
          <StatementTile label="Savings" value={totals.savings} cls="text-blue-600" />
          <StatementTile
            label="Balance"
            value={totals.balance}
            cls={totals.balance >= 0 ? "text-navy-950" : "text-red-600"}
          />
        </div>

        <p className="mt-6 text-sm font-medium text-slate-500">
          {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
        </p>

        {transactions.length > 0 ? (
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-white">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Payment</th>
                <th className="px-3 py-2 font-semibold">Note</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={`${t.id}-${t.date}`} className="border-b border-slate-100">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {formatDisplayDate(t.date)}
                  </td>
                  <td className="px-3 py-2 capitalize">{t.type}</td>
                  <td className="px-3 py-2">{t.category}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {t.paymentMethod}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-slate-600">
                    {t.note || "—"}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums",
                      t.type === "income"
                        ? "text-green-600"
                        : t.type === "savings"
                          ? "text-blue-600"
                          : "text-red-600"
                    )}
                  >
                    {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}{" "}
                    {formatINR(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">
            No transactions match the current filters.
          </p>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Balance = Income − Expenses − Savings. Generated by Money Manager.
        </p>
      </div>
    </div>
  );
}

function StatementTile({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("mt-0.5 text-base font-bold tracking-tight", cls)}>{formatINR(value)}</p>
    </div>
  );
}