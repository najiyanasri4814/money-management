/** Indian Rupee formatting helpers. */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,00,000.00 (Indian digit grouping) */
export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) amount = 0;
  const sign = amount < 0 ? "-" : "";
  return sign + inr.format(Math.abs(amount));
}

/** Compact form: ₹1L, ₹12.5K, ₹250 */
export function formatCompactINR(amount: number): string {
  if (!Number.isFinite(amount)) amount = 0;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const fmt = (n: number, suffix: string) =>
    `${sign}₹${n.toLocaleString("en-IN", { maximumFractionDigits: 1 })}${suffix}`;
  if (abs >= 1_00_00_000) return fmt(abs / 1_00_00_000, "Cr");
  if (abs >= 1_00_000) return fmt(abs / 1_00_000, "L");
  if (abs >= 1_000) return fmt(abs / 1_000, "K");
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

/** Time like "14:32:05". */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/** "10 Jul 2026, 2:32 PM" */
export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Show amount with a colored sign, e.g. "+ ₹1,00,000.00" / "- ₹250.00" */
export function formatSigned(amount: number): string {
  if (amount < 0) return `- ${formatINR(Math.abs(amount))}`;
  return `+ ${formatINR(amount)}`;
}