# MoneyMngmt — Personal Money Management

A modern, responsive personal finance dashboard built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Lucide React**, and **Recharts** — backed entirely by your existing **Google Spreadsheet** through a **Google Apps Script** Web App.

No database to set up. Your spreadsheet is the source of truth: every total, table, and chart is computed from the real rows in **Sheet1**.

---

## Features

- **Dashboard (Overview)** — Total Balance, Total Income, Total Expenses, Current Month Savings; income-vs-expense bar chart, expense-by-category pie, monthly savings trend, recent transactions.
- **Transactions** — searchable/sortable table with type, category, and date-range filters; add / edit / delete (with confirmation); loading, empty, success, and error states.
- **Reports** — day / week / month / quarter / year aggregation (browse periods with ‹ › arrows); income vs expense bars, income & expense trends, savings trend, expense breakdown by category, daily average spend, per-period averages (avg income/expenses/savings per period), and **Download PDF** export of the whole report view.
- **Budgets** — set an overall monthly budget and per-category limits for your main spending categories (default + custom + categories actually used). Live progress meters show spent/remaining, budgets turn **amber at 80%** and **red when exceeded**, and you get a reminder toast the moment a budget crosses those marks. Also surfaced on the Overview as a budgeting card.
- **Export** — **Download PDF** on Overview (dashboard snapshot), Reports (current view), and Transactions (full statement of the filtered list with totals); **Export CSV** on Transactions (filtered rows, spreadsheet-native) and Reports (aggregated period data). jsPDF + html2canvas are loaded on demand.
- **Settings** — connection health check, custom categories & payment methods (stored locally, never touches existing sheet records), auto-refresh toggle, security notes.
- **Sync** — data reloads after every create/update/delete, manual refresh button, optional 60-second polling, and a visible *last synced* timestamp. (Polling only — **not** real-time push.)

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui-style components (Radix primitives) |
| Icons | lucide-react |
| Charts | Recharts |
| Data store | Google Sheets (Sheet1 + Budgets tab) |
| Backend | Existing Google Apps Script Web App (GET + `action` parameter) |

## Architecture

```
Browser (React)
   │  fetch("/api/transactions", "/api/budgets", ...) ← same-origin, no CORS
   ▼
Next.js Route Handlers  (app/api/transactions, app/api/budgets)
   │  validate input, then GET the Apps Script endpoint with ?action=...
   ▼
Your Google Apps Script Web App (script.google.com/macros/s/…/exec)
   │  doGet — reads/writes Sheet1 + Budgets tab of your spreadsheet
   ▼
Google Spreadsheet (source of truth)
```

All calls to Google are made **server-side**. The Apps Script URL lives in a server-only env var and never reaches the browser, and Google's redirect/CORS quirks are handled by the proxy.

## Spreadsheet structure (Sheet1)

Column order must stay exactly as it is:

| Col | Field | Example |
|---|---|---|
| A | `id` | 2 |
| B | `date` | 10-07-2026 |
| C | `type` | income / expense / savings |
| D | `category` | salary |
| E | `amount` | 100000 |
| F | `payment method` | bank transfer |
| G | `note` | monthly salary |

Transactions can be `income`, `expense`, or `savings`. Savings rows represent money set aside: they reduce the spendable balance (`Balance = Income − Expenses − Savings`) but are **not** counted as expenses and never appear in expense breakdowns.

The API maps these to the `Transaction` interface in `lib/types.ts`:

```ts
interface Transaction {
  id: number;
  date: string;          // normalized to YYYY-MM-DD
  type: "income" | "expense";
  category: string;
  amount: number;
  paymentMethod: string;
  note: string;
}
```

### Budgets tab (optional, created automatically)

Budgets are stored in a **`Budgets`** tab in the same spreadsheet (created on
first save) with three columns:

| Col | Field | Example |
|---|---|---|
| A | `month` (`YYYY-MM`) | 2026-10 |
| B | `category` (or `total` for the overall budget) | Food |
| C | `amount` | 8000 |

Saving a month replaces that month's rows. The app turns them into an overall
budget plus per-category budgets (`lib/budgets.ts`). Spending is measured
against the budget for the current month; **savings-type rows never count as
spending**.

### Date handling

Google Sheets can hand back dates in many shapes. `lib/date.ts` parses:

- JS Date strings — `Fri Jul 10 2026 00:00:00 GMT+0530 (India Standard Time)`
- ISO — `2026-07-10`, `2026-07-10T00:00:00.000Z`
- `DD-MM-YYYY` and `DD/MM/YYYY`
- Excel serial numbers (e.g. `46210`)

The app writes dates back as `YYYY-MM-DD`.

## Google Apps Script API contract

The deployed endpoint (`/exec`) supports **full CRUD for transactions**; the
**budget actions** (`listBudgets` / `saveBudgets`) are new and require a
one-time redeploy (steps below). All operations are **GET** requests with query
parameters — the deployed script has no `doPost`):

| Operation | Request | Response |
|---|---|---|
| List | `?action=list` | `{ success: true, data: [...records] }` |
| Add | `?action=add&date=..&type=..&category=..&amount=..&paymentMethod=..&note=..` | `{ success: true, id: <new id> }` |
| Update | `?action=update&id=N&<all fields>` | `{ success: true }` — **replaces the whole row**, send every field |
| Delete | `?action=delete&id=N` | `{ success: true }` |
| List budgets | `?action=listBudgets` | `{ success: true, data: [{month, category, amount}, …] }` |
| Save budgets | `?action=saveBudgets&month=YYYY-MM&budgets=<JSON array>` | `{ success: true, count: n }` — replaces that month's rows |

> ⚠️ **Update replaces the row.** The Apps Script `update` action rewrites the target row from the supplied parameters, so missing parameters clear columns. The Next.js proxy always sends all six fields.

A faithful reference implementation lives in [`apps-script/Code.gs`](apps-script/Code.gs) (identical behavior; redeploy only if you want to re-host or extend the backend). It includes an optional, disabled-by-default `SCRIPT_ACCESS_TOKEN` gate.

### Enabling budget sync (one-time Apps Script redeploy)

The budgets page works immediately out of the box: until the backend supports
budget actions, budgets are kept in **localStorage** and a banner explains how
to enable sheet sync. To make budgets live in your Google Sheet:

1. Open the Apps Script project attached to your spreadsheet
   (`Extensions → Apps Script`) and replace its `Code.gs` with
   [`apps-script/Code.gs`](apps-script/Code.gs) in this repo.
2. `Deploy → Manage deployments → ✏️ edit` the Web App → set **Version** to
   *New version* → **Deploy**. (The URL stays the same, so no env changes.)
3. Refresh the app — the banner disappears and budgets now read/write the
   `Budgets` tab.

## Getting started

**Prerequisites:** Node.js ≥ 18.17 (developed on Node 26).

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env.local
#    set APPS_SCRIPT_URL to your Apps Script Web App URL (must end with /exec)

# 3. Run in development
npm run dev
#    open http://localhost:3000
```

Required env vars (see `.env.example`):

| Var | Description |
|---|---|
| `APPS_SCRIPT_URL` | *Optional.* Apps Script Web App URL, e.g. `https://script.google.com/macros/s/<ID>/exec`. **Baked in by default** — only set this to override the endpoint. |
| `API_ACCESS_TOKEN` | *Optional.* When set, every request to `/api/transactions*` must send `Authorization: Bearer <token>`. Use for public deployments. |

The app ships with the endpoint URL hardcoded (server-only), so it deploys to
Vercel or any Node host with **zero** environment setup.

## Verifying end-to-end sync

1. **Website → Spreadsheet:** open `/transactions`, add a transaction, then open your spreadsheet. A new row appears in Sheet1 with an auto-generated id.
2. **Spreadsheet → Website:** add a row directly in the spreadsheet (sheet must save; Dates are fine), then click **Refresh** (or wait ≤60 s with auto-refresh on). The new row appears in the app.
3. Edit and delete from the app and check the spreadsheet row changes/removes; delete/rename a row in the sheet and refresh the app.

## Deployment

**Vercel (recommended):**

```bash
npm i -g vercel
vercel
# APPS_SCRIPT_URL no longer needs to be set — it is baked in. Only add
# API_ACCESS_TOKEN (if you enable it) under Project → Settings → Environment Variables
```

Any Node host that supports Next.js works the same way. Build with `npm run build` and serve with `npm run start`.

### Security notes (read before going public)

- Your Apps Script Web App is **unauthenticated**: anyone with the URL can read/write the sheet. That is fine for personal/local use.
- If you deploy publicly, **enable `API_ACCESS_TOKEN`** and/or add a real login layer in front of the app (the current app is intentionally a single-user personal tool).
- The Apps Script URL is only used server-side via `APPS_SCRIPT_URL`; it is never bundled into client code. `API_ACCESS_TOKEN` is likewise server-only.
- Nothing in this project stores spreadsheet credentials; Google's Apps Script executes on its own authorization (set to *Execute as: me* when you deployed it).

## Project structure

```
app/
  (dashboard)/            # Routes behind the app shell: Overview, Transactions,
                          # Reports, Budgets, Settings
  api/transactions/       # Server-side proxy route handlers (GET/POST, [id], health)
  api/budgets/            # Budget proxy route handlers (GET / PUT)
  layout.tsx, globals.css
components/
  budgets/                # Budget meter + budgets page building blocks
  charts/                 # Recharts wrappers + shared tooltip/colors
  dashboard/              # Summary cards, budget overview card
  layout/                 # Sidebar, topbar, app shell, toasts
  providers/              # Transactions + Budgets contexts (state, refresh, polling, CRUD)
  transactions/           # Table, filters, add/edit dialog, delete dialog
  ui/                     # shadcn-style primitives (Button, Dialog, Select, …)
lib/
  api.ts                  # Server-side Apps Script client (never runs in the browser)
  client-api.ts           # Browser fetch wrappers for /api/transactions + /api/budgets
  budgets.ts              # Budget model: progress, thresholds, localStorage fallback
  types.ts  constants.ts  date.ts  format.ts  stats.ts  validation.ts  utils.ts
apps-script/Code.gs       # Reference Apps Script backend (same contract as deployed)
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| “APPS_SCRIPT_URL is not configured” | Set the env var and restart the dev server. |
| `502` from `/api/transactions` | Apps Script unreachable, timed out (20 s), returned non-JSON, or returned `{success:false}`. Check the URL ends with `/exec` and that the script is deployed as a Web App with *Execute as: me* and *Access: anyone*. |
| CORS errors in the browser | Shouldn't happen — all Google calls are server-side. If you see them, a browser is calling the Apps Script URL directly somewhere; it isn't. |
| POST requests to the Apps Script script fail | Expected. The deployed script implements `doGet` only. The app never POSTs to Google. |
| Date shows wrong day | The parser handles the common formats; if your sheet uses a serial number or a custom format not covered, edit `parseSheetDate` in `lib/date.ts`. |
| Stale data after editing the sheet | Click Refresh, or wait for the 60-second poll. Google does not push spreadsheet changes. |
| App says “No transactions” but the sheet has data | Confirm Sheet1 is first/active and rows have values in column A (the API skips fully empty rows). |
| Budgets page shows a “saved in this browser” banner | The deployed Apps Script doesn't have the budget actions yet — follow the one-time redeploy steps above; until then budgets are stored in localStorage. |

## Not implemented / not claimed

- **Real-time sync** is *not* claimed — the app uses manual refresh + optional 60-second polling.
- No multi-user or per-account data isolation; this is a single-user personal tool by design.
- No offline support or local cache beyond the in-memory provider state.