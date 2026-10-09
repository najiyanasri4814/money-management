import type { Metadata } from "next";
import "./globals.css";
import { TransactionsProvider } from "@/components/providers/transactions-provider";

export const metadata: Metadata = {
  title: {
    default: "MoneyMngmt — Personal Finance",
    template: "%s · MoneyMngmt",
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
        <TransactionsProvider>{children}</TransactionsProvider>
      </body>
    </html>
  );
}