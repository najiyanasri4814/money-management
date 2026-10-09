"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useTransactions } from "@/components/providers/transactions-provider";
import { cn } from "@/lib/utils";

const styles = {
  success: { box: "border-green-200 bg-white text-green-700", icon: <CheckCircle2 className="h-4 w-4" /> },
  error: { box: "border-red-200 bg-white text-red-600", icon: <AlertCircle className="h-4 w-4" /> },
  info: { box: "border-slate-200 bg-white text-navy-800", icon: <Info className="h-4 w-4" /> },
} as const;

export function ToastViewport() {
  const { toast, dismissToast } = useTransactions();

  if (!toast) return null;
  const s = styles[toast.kind];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-fade-in",
          s.box
        )}
      >
        {s.icon}
        <span className="max-w-md">{toast.message}</span>
        <button
          onClick={dismissToast}
          className="ms-1 rounded-md p-0.5 text-current opacity-60 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}