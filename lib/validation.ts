import type { TransactionInput, TransactionType } from "./types";

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

/**
 * Shared validation used by both the server route handlers (source of truth)
 * and the client form (instant feedback).
 */
export function validateTransactionInput(
  input: Partial<TransactionInput>
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.date || typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.date = "A valid date is required (YYYY-MM-DD).";
  }

  if (input.type !== "income" && input.type !== "expense" && input.type !== "savings") {
    errors.type = "Type must be 'income', 'expense', or 'savings'.";
  }

  if (!input.category || typeof input.category !== "string" || input.category.trim().length === 0) {
    errors.category = "Category is required.";
  }

  const amount =
    typeof input.amount === "number"
      ? input.amount
      : typeof input.amount === "string"
        ? Number(input.amount)
        : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Amount must be a positive number.";
  }

  if (
    !input.paymentMethod ||
    typeof input.paymentMethod !== "string" ||
    input.paymentMethod.trim().length === 0
  ) {
    errors.paymentMethod = "Payment method is required.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function isTransactionType(v: unknown): v is TransactionType {
  return v === "income" || v === "expense" || v === "savings";
}