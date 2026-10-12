"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, BarChart3, LayoutDashboard, Settings, Target, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onCloseMobile}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-navy-900 text-white shadow-sm"
                : "text-navy-600 hover:bg-slate-100 hover:text-navy-950"
            )}
          >
            <Icon className={cn("h-[18px] w-[18px]", active ? "text-white" : "text-navy-400")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarBrand />
        {nav}
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-navy-950/50 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={onCloseMobile}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between pe-3">
            <SidebarBrand />
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-950"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {nav}
          <SidebarFooter />
        </aside>
      </div>
    </>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white">
        <Wallet className="h-[18px] w-[18px]" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight text-navy-950">MoneyMngmt</p>
        <p className="text-[11px] text-slate-400">Powered by Google Sheets</p>
      </div>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <p className="text-[11px] leading-relaxed text-slate-400">
        Data lives in your Google Spreadsheet. Edits sync on refresh.
      </p>
    </div>
  );
}