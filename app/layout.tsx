import type { Metadata } from "next";
import "./globals.css";
import { TransactionsProvider } from "@/components/providers/transactions-provider";
import { BudgetsProvider } from "@/components/providers/budgets-provider";

export const metadata: Metadata = {
  title: {
    default: "Money Management — Personal Finance",
    template: "%s · Money Management",
  },
  description:
    "Personal money management dashboard backed by Google Sheets — track income, expenses, and savings.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TransactionsProvider>
          <BudgetsProvider>{children}</BudgetsProvider>
        </TransactionsProvider>
      </body>
    </html>
  );
}