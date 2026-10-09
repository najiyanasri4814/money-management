"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { TransactionsFilters, DEFAULT_FILTERS, type FilterState } from "@/components/transactions/transactions-filters";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog";
import { DeleteTransactionDialog } from "@/components/transactions/delete-transaction-dialog";
import { StatementPreview } from "@/components/transactions/statement-preview";
import { useTransactions } from "@/components/providers/transactions-provider";
import { downloadCSV, todayFilenameStamp } from "@/lib/csv";
import type { Transaction, TransactionInput } from "@/lib/types";

export default function TransactionsPage() {
  const { transactions, status, error, refresh, add, update, remove } = useTransactions();

  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);
  const [deleting, setDeleting] = React.useState<Transaction | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [statementOpen, setStatementOpen] = React.useState(false);
  const statementRef = React.useRef<HTMLDivElement>(null);

  const categories = React.useMemo(
    () => [...new Set(transactions.map((t) => t.category))].sort((a, b) => a.localeCompare(b)),
    [transactions]
  );

  const filtered = React.useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let list = transactions.filter((t) => {
      if (q && !t.category.toLowerCase().includes(q) && !t.note.toLowerCase().includes(q)) {
        return false;
      }
      if (filters.type !== "all" && t.type !== filters.type) return false;
      if (filters.category !== "all" && t.category !== filters.category) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      filters.sort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );
    return list;
  }, [transactions, filters]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setFormOpen(true);
  };

  const handleSubmit = async (input: TransactionInput) => {
    if (busy) return;
    setBusy(true);
    try {
      if (editing) {
        await update(editing.id, input);
      } else {
        await add(input);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (t: Transaction) => {
    await remove(t.id);
  };

  const handleCsvExport = () => {
    downloadCSV(
      `money-transactions-${todayFilenameStamp()}.csv`,
      ["Id", "Date", "Type", "Category", "Amount", "Payment method", "Note"],
      filtered.map((t) => [t.id, t.date, t.type, t.category, t.amount, t.paymentMethod, t.note])
    );
  };

  const handleStatementPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Render the full statement view, give it a moment to paint, then capture it.
      setStatementOpen(true);
      await new Promise((r) => setTimeout(r, 300));
      const el = statementRef.current;
      if (!el) throw new Error("Statement not rendered");
      const { captureElementToPdf, todayFilenameStamp } = await import("@/lib/pdf");
      await captureElementToPdf(
        el,
        `money-statement-${todayFilenameStamp()}.pdf`,
        [".pdf-exclude"]
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setStatementOpen(false);
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-navy-950">All transactions</h2>
          <p className="mt-1 text-sm text-slate-500">
            {transactions.length} record{transactions.length === 1 ? "" : "s"} in your spreadsheet
            {status === "loading" ? " · loading…" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleStatementPdf}
            disabled={exporting || status === "loading"}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Preparing PDF…" : "Download PDF"}
          </Button>
          <Button variant="outline" onClick={handleCsvExport}>
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => void refresh()} disabled={status === "loading"}>
            Refresh
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            New transaction
          </Button>
        </div>
      </div>

      {status === "error" && transactions.length > 0 && (
        <Alert variant="warning" title="Sync problem">
          {error} Showing the last loaded data. Refresh to retry.
        </Alert>
      )}

      <TransactionsFilters
        value={filters}
        onChange={setFilters}
        categories={categories}
        resultCount={filtered.length}
      />

      <TransactionsTable
        transactions={filtered}
        loading={status === "loading"}
        error={error}
        onEdit={openEdit}
        onDelete={setDeleting}
        onAdd={openAdd}
      />

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={handleSubmit}
      />

      <DeleteTransactionDialog
        target={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={handleDelete}
      />

      {statementOpen && (
        <StatementPreview
          transactions={filtered}
          filters={filters}
          innerRef={statementRef}
          onClose={() => setStatementOpen(false)}
        />
      )}
    </div>
  );
}