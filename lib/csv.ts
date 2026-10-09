/**
 * Client-side CSV export helpers. Lightweight, zero dependencies —
 * safe to import statically (no bundle bloat).
 */

/** "2026-10-09" style date used in export filenames. */
export function todayFilenameStamp(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Generate a CSV file (Excel-compatible) and trigger a download.
 * Fields containing commas, quotes, or newlines are quoted/escaped; a UTF-8
 * BOM is prepended so Excel renders ₹ and other characters correctly.
 */
export function downloadCSV(
  filename: string,
  header: string[],
  rows: Array<Array<string | number>>
): void {
  const escape = (value: string | number): string => {
    const s = String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    header.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];
  const csv = "\uFEFF" + lines.join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}