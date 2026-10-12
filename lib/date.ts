/**
 * Robust date handling for Google Sheets data.
 *
 * Google Apps Script may return dates in several shapes:
 *  - JS Date toString:  "Fri Jul 10 2026 00:00:00 GMT+0530 (India Standard Time)"
 *  - ISO date string:   "2026-07-10" or "2026-07-10T00:00:00.000Z"
 *  - DD-MM-YYYY:        "10-07-2026"
 *  - DD/MM/YYYY:        "10/07/2026"
 *  - Excel serial:      46210 (number of days since 1899-12-30)
 */

/** Parse any of the above shapes into a Date, or null when unparseable. */
export function parseSheetDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  if (typeof value === "number") {
    // Excel serial date (2026-07-10 ≈ 46210). Convert from days since 1899-12-30.
    if (value > 0 && value < 60000) {
      const ms = Math.round((value - 25569) * 86400 * 1000);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // DD-MM-YYYY or DD/MM/YYYY (European/Indian style, common in Sheets)
    const dmY = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmY) {
      const d = new Date(Number(dmY[3]), Number(dmY[2]) - 1, Number(dmY[1]));
      // guard against rollover (e.g. 31-02-2026)
      if (
        d.getDate() === Number(dmY[1]) &&
        d.getMonth() === Number(dmY[2]) - 1 &&
        d.getFullYear() === Number(dmY[3])
      ) {
        return d;
      }
    }

    // ISO YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})([T ].*)?$/);
    if (iso) {
      return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/** Format a Date as local YYYY-MM-DD (used when writing back to the sheet). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Normalize any sheet date value to YYYY-MM-DD, or "" when unparseable. */
export function normalizeDate(value: unknown): string {
  const d = parseSheetDate(value);
  return d ? toISODate(d) : "";
}

/** Format a YYYY-MM-DD date for display, e.g. "10 Jul 2026". */
export function formatDisplayDate(dateStr: string): string {
  const d = parseSheetDate(dateStr);
  if (!d) return dateStr || "—";
  const month = d.toLocaleString("en-IN", { month: "short" });
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/** YYYY-MM key used for month grouping. */
export function monthKey(dateStr: string): string {
  const d = parseSheetDate(dateStr);
  if (!d) return "unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** YYYY-MM-DD key used for daily grouping. */
export function dayKey(dateStr: string): string {
  const d = parseSheetDate(dateStr);
  if (!d) return "unknown";
  return toISODate(d);
}

/** Week-start (Monday, YYYY-MM-DD) key used for weekly grouping. */
export function weekKey(dateStr: string): string {
  const d = parseSheetDate(dateStr);
  if (!d) return "unknown";
  const mondayOffset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayOffset);
  return toISODate(monday);
}

/** Short label for a day/week key, e.g. "28 Sep". */
export function shortDateLabel(iso: string): string {
  const d = parseSheetDate(iso);
  if (!d) return iso;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short" });
}

/** YYYY key used for year grouping. */
export function yearKey(dateStr: string): string {
  const d = parseSheetDate(dateStr);
  if (!d) return "unknown";
  return String(d.getFullYear());
}

/** Quarter key used for quarterly grouping, e.g. "2026-Q1". */
export function quarterKey(dateStr: string): string {
  const d = parseSheetDate(dateStr);
  if (!d) return "unknown";
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
}

/** Short label for a month group key, e.g. "Jul 26" / "Jul 2026". */
export function monthLabel(key: string, withYear = true): string {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  const month = d.toLocaleString("en-IN", { month: "short" });
  return withYear ? `${month} ${m[1].slice(2)}` : month;
}

export function quarterLabel(key: string): string {
  return key;
}

/** Full month + year label, e.g. "October 2026" (raw key when unparseable). */
export function monthLongLabel(key: string): string {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}