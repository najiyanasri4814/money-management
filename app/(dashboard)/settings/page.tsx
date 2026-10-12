"use client";

import * as React from "react";
import {
  CircleCheck,
  CloudCog,
  Database,
  GitBranch,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/components/providers/transactions-provider";
import { fetchBudgetsStatus, fetchHealth, type BudgetsStatus } from "@/lib/client-api";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_SAVINGS_CATEGORIES,
  getCustomCategories,
  getCustomPaymentMethods,
  saveCustomCategories,
  saveCustomPaymentMethods,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { HealthResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { transactions, lastSync, autoRefresh, setAutoRefresh, refresh } = useTransactions();

  const [customCats, setCustomCats] = React.useState<string[]>([]);
  const [customMethods, setCustomMethods] = React.useState<string[]>([]);
  const [newCat, setNewCat] = React.useState("");
  const [newMethod, setNewMethod] = React.useState("");
  const [health, setHealth] = React.useState<HealthResponse | null>(null);
  const [budgetStatus, setBudgetStatus] = React.useState<BudgetsStatus | null>(null);
  const [testing, setTesting] = React.useState(false);
  const [healthError, setHealthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCustomCats(getCustomCategories());
    setCustomMethods(getCustomPaymentMethods());
  }, []);

  const runHealthCheck = async () => {
    setTesting(true);
    setHealthError(null);
    try {
      const [result, budgetResult] = await Promise.all([
        fetchHealth(),
        fetchBudgetsStatus(),
      ]);
      setHealth(result);
      setBudgetStatus(budgetResult);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : "Health check failed.");
    } finally {
      setTesting(false);
    }
  };

  const addCategory = () => {
    const name = newCat.trim();
    if (!name) return;
    const next = [...new Set([...customCats, name])];
    setCustomCats(next);
    saveCustomCategories(next);
    setNewCat("");
  };

  const removeCategory = (name: string) => {
    const next = customCats.filter((c) => c !== name);
    setCustomCats(next);
    saveCustomCategories(next);
  };

  const addMethod = () => {
    const name = newMethod.trim();
    if (!name) return;
    const next = [...new Set([...customMethods, name])];
    setCustomMethods(next);
    saveCustomPaymentMethods(next);
    setNewMethod("");
  };

  const removeMethod = (name: string) => {
    const next = customMethods.filter((m) => m !== name);
    setCustomMethods(next);
    saveCustomPaymentMethods(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-navy-950">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Connection details, categories, payment methods, and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudCog className="h-4 w-4 text-slate-400" />
              Google Sheets connection
            </CardTitle>
            <CardDescription>
              Transactions are proxied to your Google Apps Script Web App and
              stored in Sheet1 of your spreadsheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <Row label="Transaction rows loaded" value={String(transactions.length)} />
              <Row
                label="Budget backend"
                value={
                  budgetStatus
                    ? budgetStatus.connected
                      ? `Connected · ${budgetStatus.rowCount} row${budgetStatus.rowCount === 1 ? "" : "s"}`
                      : (budgetStatus.message ?? "Unavailable")
                    : "—"
                }
              />
              <Row
                label="Last sync"
                value={lastSync ? formatDateTime(lastSync) : "Never"}
                mono={false}
              />
              <Row
                label="Sync mode"
                value={autoRefresh ? "Auto-refresh every 60s" : "Manual only"}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void runHealthCheck()}
                loading={testing}
                loadingText="Testing…"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Test connection
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void refresh()}>
                Refresh now
              </Button>
            </div>

            {testing && <Skeleton className="h-16 w-full" />}

            {!testing && budgetStatus && !budgetStatus.connected && (
              <Alert variant="warning" title="Budgets are not connected to the sheet yet">
                Google still answers with{" "}
                <code className="rounded bg-amber-100/60 px-1.5 py-0.5 text-xs">
                  {budgetStatus.message}
                </code>
                . The deployed Apps Script needs the redeploy described on the
                Budgets page (or in the README) — transaction rows work fine.
              </Alert>
            )}

            {!testing && health && health.ok && (
              <Alert variant="success" title="Connection OK">
                Fetched {health.rowCount} rows from Google Sheets
                {health.syncedAt ? ` · ${formatDateTime(new Date(health.syncedAt))}` : ""}.
              </Alert>
            )}

            {!testing && ((health && !health.ok) || healthError) && (
              <Alert variant="error" title="Connection failed">
                {(health?.lastError ?? healthError) ??
                  "The Google Sheets API could not be reached."}
              </Alert>
            )}

            {!testing && !health && !healthError && (
              <p className="text-xs text-slate-400">
                Tip: run a health check to verify the Apps Script endpoint is
                reachable from this server.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-slate-400" />
              Synchronization
            </CardTitle>
            <CardDescription>
              The spreadsheet is the source of truth. The app polls it — it does
              not receive push updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-medium text-navy-950">Auto-refresh every 60s</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Picks up edits made directly in Google Sheets.
                </p>
              </div>
              <ToggleSwitch
                checked={autoRefresh}
                onChange={setAutoRefresh}
                label="Auto-refresh"
              />
            </div>
            <p className="text-xs text-slate-400">
              Everything you add or edit here is written straight to Sheet1
              (id, date, type, category, amount, payment method, note).
              Changes made outside the app appear on the next poll or manual
              refresh — the spreadsheet does not push updates.
            </p>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-400" />
              Categories
            </CardTitle>
            <CardDescription>
              Defaults plus your own. Custom categories apply to both income and
              expense rows without changing existing records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="label-text">Income</p>
              <Chips items={DEFAULT_INCOME_CATEGORIES} />
            </div>
            <div>
              <p className="label-text">Savings</p>
              <Chips items={DEFAULT_SAVINGS_CATEGORIES} />
            </div>
            <div>
              <p className="label-text">Expense</p>
              <Chips items={DEFAULT_EXPENSE_CATEGORIES} />
            </div>
            <div>
              <p className="label-text">Your custom categories</p>
              {customCats.length === 0 ? (
                <p className="text-xs text-slate-400">
                  None yet — add one below, or choose “New category…” in the
                  transaction form.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {customCats.map((c) => (
                    <Badge key={c} variant="secondary" className="gap-1 pr-1">
                      {c}
                      <button
                        onClick={() => removeCategory(c)}
                        className="rounded p-0.5 hover:bg-red-100 hover:text-red-600"
                        aria-label={`Remove category ${c}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <AddRow
              value={newCat}
              onChange={setNewCat}
              onAdd={addCategory}
              label="Add a custom category"
            />
          </CardContent>
        </Card>

        {/* Payment methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-slate-400" />
              Payment methods
            </CardTitle>
            <CardDescription>
              Default methods plus your own, used in the transaction form.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="label-text">Defaults</p>
              <Chips items={DEFAULT_PAYMENT_METHODS} />
            </div>
            <div>
              <p className="label-text">Your custom methods</p>
              {customMethods.length === 0 ? (
                <p className="text-xs text-slate-400">
                  None yet — add one below, or choose “New method…” in the
                  transaction form.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {customMethods.map((m) => (
                    <Badge key={m} variant="secondary" className="gap-1 pr-1">
                      {m}
                      <button
                        onClick={() => removeMethod(m)}
                        className="rounded p-0.5 hover:bg-red-100 hover:text-red-600"
                        aria-label={`Remove payment method ${m}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <AddRow
              value={newMethod}
              onChange={setNewMethod}
              onAdd={addMethod}
              label="Add a custom payment method"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-slate-400" />
            Security notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            This app talks to your Apps Script endpoint through a server-side
            proxy; the endpoint URL stays out of browser code.
          </p>
          <p>
            Anyone with the Apps Script URL can currently read and write your
            sheet. If you deploy this app publicly, enable{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              API_ACCESS_TOKEN
            </code>{" "}
            on the server (or add real authentication) and restrict who can
            access the deployment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-slate-500">{label}</span>
      <span className={cn("text-navy-950", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c) => (
        <Badge key={c} variant="outline" className="font-normal">
          {c}
        </Badge>
      ))}
    </div>
  );
}

function AddRow({
  label,
  value,
  onChange,
  onAdd,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Label className="mb-1.5 block text-xs text-slate-500">{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder="Type a name…"
        />
      </div>
      <Button variant="outline" size="sm" onClick={onAdd} className="h-10">
        <Plus className="h-4 w-4" />
        Add
      </Button>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40 focus-visible:ring-offset-2",
        checked ? "bg-green-600" : "bg-slate-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}