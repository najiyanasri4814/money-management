"use client";

import * as React from "react";
import {
  addTransaction as apiAdd,
  deleteTransaction as apiDelete,
  getTransactions as apiGet,
  updateTransaction as apiUpdate,
} from "@/lib/client-api";
import { STORAGE_KEYS } from "@/lib/constants";
import type { Transaction, TransactionInput } from "@/lib/types";

export type SyncStatus = "loading" | "ready" | "error";
export type NotifyKind = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  kind: NotifyKind;
}

interface TransactionsContextValue {
  transactions: Transaction[];
  status: SyncStatus;
  error: string | null;
  lastSync: Date | null;
  refreshing: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  refresh: () => Promise<void>;
  add: (input: TransactionInput) => Promise<Transaction>;
  update: (id: number, input: TransactionInput) => Promise<Transaction>;
  remove: (id: number) => Promise<void>;
  notify: (message: string, kind?: NotifyKind) => void;
  toast: Toast | null;
  dismissToast: () => void;
}

const TransactionsContext = React.createContext<TransactionsContextValue | null>(null);

const POLL_INTERVAL_MS = 60_000;

function readAutoRefresh(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.autoRefresh);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export function TransactionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [status, setStatus] = React.useState<SyncStatus>("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [autoRefresh, setAutoRefreshState] = React.useState(true);
  const [toast, setToast] = React.useState<Toast | null>(null);

  const busyRef = React.useRef(false);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshedAtLeastOnce = React.useRef(false);

  const dismissToast = React.useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const notify = React.useCallback(
    (message: string, kind: NotifyKind = "info") => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ id: Date.now(), message, kind });
      toastTimer.current = setTimeout(() => setToast(null), 4500);
    },
    []
  );

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await apiGet();
      setTransactions(data);
      setError(null);
      setStatus("ready");
      setLastSync(new Date());
      refreshedAtLeastOnce.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load transactions.";
      setError(message);
      // Keep showing stale data if we have it; only surface the error state when empty.
      if (!refreshedAtLeastOnce.current) setStatus("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Persist auto-refresh preference and poll periodically (not real-time —
  // polling only; external sheet edits appear within ~60s).
  const setAutoRefresh = React.useCallback((v: boolean) => {
    setAutoRefreshState(v);
    try {
      window.localStorage.setItem(STORAGE_KEYS.autoRefresh, String(v));
    } catch {
      // ignore storage errors
    }
  }, []);

  React.useEffect(() => {
    setAutoRefreshState(readAutoRefresh());
  }, []);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const add = React.useCallback(
    async (input: TransactionInput): Promise<Transaction> => {
      if (busyRef.current) throw new Error("A request is already in progress.");
      busyRef.current = true;
      try {
        const created = await apiAdd(input);
        notify(`Transaction added (id ${created.id}).`, "success");
        await refresh();
        return created;
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to add transaction.", "error");
        throw err;
      } finally {
        busyRef.current = false;
      }
    },
    [notify, refresh]
  );

  const update = React.useCallback(
    async (id: number, input: TransactionInput): Promise<Transaction> => {
      if (busyRef.current) throw new Error("A request is already in progress.");
      busyRef.current = true;
      try {
        const updated = await apiUpdate(id, input);
        notify(`Transaction ${id} updated.`, "success");
        await refresh();
        return updated;
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to update transaction.", "error");
        throw err;
      } finally {
        busyRef.current = false;
      }
    },
    [notify, refresh]
  );

  const remove = React.useCallback(
    async (id: number): Promise<void> => {
      if (busyRef.current) throw new Error("A request is already in progress.");
      busyRef.current = true;
      try {
        await apiDelete(id);
        notify(`Transaction ${id} deleted.`, "success");
        await refresh();
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to delete transaction.", "error");
        throw err;
      } finally {
        busyRef.current = false;
      }
    },
    [notify, refresh]
  );

  const value: TransactionsContextValue = {
    transactions,
    status,
    error,
    lastSync,
    refreshing,
    autoRefresh,
    setAutoRefresh,
    refresh,
    add,
    update,
    remove,
    notify,
    toast,
    dismissToast,
  };

  return (
    <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
  );
}

export function useTransactions(): TransactionsContextValue {
  const ctx = React.useContext(TransactionsContext);
  if (!ctx) {
    throw new Error("useTransactions must be used within a TransactionsProvider.");
  }
  return ctx;
}