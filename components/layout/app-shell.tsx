"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { ToastViewport } from "./toast-viewport";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar mobileOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-slate-400">
            MoneyMngmt · Transactions and budgets are read from and written to
            your Google Spreadsheet.
          </p>
        </footer>
      </div>
      <ToastViewport />
    </div>
  );
}