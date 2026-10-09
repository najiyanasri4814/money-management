"use client";

import * as React from "react";
import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import {
  categoriesForType,
  allPaymentMethods,
  saveCustomCategories,
  saveCustomPaymentMethods,
} from "@/lib/constants";
import { toISODate } from "@/lib/date";
import { validateTransactionInput } from "@/lib/validation";
import type { Transaction, TransactionInput, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

const CUSTOM_CATEGORY_VALUE = "__custom_category__";
const CUSTOM_METHOD_VALUE = "__custom_method__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Transaction being edited, or null when adding a new one. */
  editing: Transaction | null;
  onSubmit: (input: TransactionInput) => Promise<void>;
}

function todayISO(): string {
  return toISODate(new Date());
}

export function TransactionFormDialog({ open, onOpenChange, editing, onSubmit }: Props) {
  const [type, setType] = React.useState<TransactionType>("expense");
  const [date, setDate] = React.useState(todayISO());
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [categoryCustom, setCategoryCustom] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [methodCustom, setMethodCustom] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const isEditing = editing !== null;

  // Sync form state whenever the dialog opens for a different record.
  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setDate(editing.date);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setCategoryCustom("");
      setPaymentMethod(editing.paymentMethod);
      setMethodCustom("");
      setNote(editing.note);
    } else {
      setType("expense");
      setDate(todayISO());
      setAmount("");
      setCategory("");
      setCategoryCustom("");
      setPaymentMethod("");
      setMethodCustom("");
      setNote("");
    }
    setErrors({});
    setSubmitError(null);
  }, [open, editing]);

  const categoryOptions = React.useMemo(() => {
    const options = categoriesForType(type);
    if (editing && editing.type === type && !options.includes(editing.category)) {
      return [editing.category, ...options];
    }
    return options;
  }, [type, editing]);

  const methodOptions = React.useMemo(() => {
    const options = allPaymentMethods();
    if (editing && !options.includes(editing.paymentMethod)) {
      return [editing.paymentMethod, ...options];
    }
    return options;
  }, [editing]);

  const usingCustomCategory = category === CUSTOM_CATEGORY_VALUE;
  const usingCustomMethod = paymentMethod === CUSTOM_METHOD_VALUE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const resolvedCategory = usingCustomCategory ? categoryCustom.trim() : category;
    const resolvedMethod = usingCustomMethod ? methodCustom.trim() : paymentMethod;

    const input: TransactionInput = {
      date,
      type,
      category: resolvedCategory,
      amount: Number(amount),
      paymentMethod: resolvedMethod,
      note: note.trim(),
    };

    const validation = validateTransactionInput(input);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setBusy(true);
    try {
      await onSubmit(input);
      // Persist any newly created custom category / payment method locally so
      // they appear in future dropdowns (existing sheet records are untouched).
      try {
        if (usingCustomCategory && resolvedCategory) {
          const current = new Set(categoriesForType("expense"));
          if (!current.has(resolvedCategory)) {
            saveCustomCategories([...new Set([...categoriesForType("expense"), resolvedCategory])]);
          }
        }
        if (usingCustomMethod && resolvedMethod) {
          const current = new Set(allPaymentMethods());
          if (!current.has(resolvedMethod)) {
            saveCustomPaymentMethods([...new Set([...allPaymentMethods(), resolvedMethod])]);
          }
        }
      } catch {
        // localStorage unavailable — ignore, the transaction itself already saved.
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit transaction #${editing.id}` : "Add transaction"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details below. The row in Google Sheets will be replaced."
              : "Enter the details; a new row is appended to your spreadsheet."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {submitError && (
            <Alert variant="error" title="Save failed">
              {submitError}
            </Alert>
          )}

          {/* Type selector */}
          <div role="radiogroup" aria-label="Transaction type">
            <span className="label-text">Type</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={type === "income"}
                onClick={() => setType("income")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
                  type === "income"
                    ? "border-green-600 bg-green-50 text-green-700 ring-2 ring-green-600/20"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                Income
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={type === "expense"}
                onClick={() => setType("expense")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
                  type === "expense"
                    ? "border-red-600 bg-red-50 text-red-700 ring-2 ring-red-600/20"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                <TrendingDown className="h-4 w-4" />
                Expense
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={type === "savings"}
                onClick={() => setType("savings")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
                  type === "savings"
                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/20"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                <PiggyBank className="h-4 w-4" />
                Savings
              </button>
            </div>
            {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Date */}
            <div>
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5"
              />
              {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="tx-amount">Amount (₹)</Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  ₹
                </span>
                <Input
                  id="tx-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
            </div>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="tx-category">Category</Label>
            <div className="mt-1.5 space-y-2">
              <Select value={category} onValueChange={(v) => { setCategory(v); setErrors((p) => ({ ...p, category: "" })); }}>
                <SelectTrigger id="tx-category" className={errors.category ? "border-red-400" : ""}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_CATEGORY_VALUE}>＋ New category…</SelectItem>
                </SelectContent>
              </Select>
              {usingCustomCategory && (
                <Input
                  placeholder="Category name, e.g. Groceries"
                  value={categoryCustom}
                  onChange={(e) => setCategoryCustom(e.target.value)}
                  autoFocus
                  aria-label="New category name"
                />
              )}
            </div>
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
          </div>

          {/* Payment method */}
          <div>
            <Label htmlFor="tx-method">Payment method</Label>
            <div className="mt-1.5 space-y-2">
              <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setErrors((p) => ({ ...p, paymentMethod: "" })); }}>
                <SelectTrigger id="tx-method" className={errors.paymentMethod ? "border-red-400" : ""}>
                  <SelectValue placeholder="Select a payment method" />
                </SelectTrigger>
                <SelectContent>
                  {methodOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_METHOD_VALUE}>＋ New method…</SelectItem>
                </SelectContent>
              </Select>
              {usingCustomMethod && (
                <Input
                  placeholder="Method name, e.g. Net Banking"
                  value={methodCustom}
                  onChange={(e) => setMethodCustom(e.target.value)}
                  autoFocus
                  aria-label="New payment method name"
                />
              )}
            </div>
            {errors.paymentMethod && (
              <p className="mt-1 text-xs text-red-600">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="tx-note">Note (optional)</Label>
            <Textarea
              id="tx-note"
              placeholder="e.g. Lunch, monthly salary…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1.5"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" loading={busy} loadingText="Saving…">
              {isEditing ? "Save changes" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}