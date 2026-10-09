"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export interface FilterState {
  search: string;
  type: "all" | "income" | "expense" | "savings";
  category: string; // "all" or a category name
  sort: "newest" | "oldest";
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  type: "all",
  category: "all",
  sort: "newest",
};

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  categories: string[];
  resultCount: number;
}

export function TransactionsFilters({ value, onChange, categories, resultCount }: Props) {
  const set = <K extends keyof FilterState>(key: K, v: FilterState[K]) =>
    onChange({ ...value, [key]: v });

  const hasActiveFilters =
    value.search !== "" || value.type !== "all" || value.category !== "all";

  return (
    <div className="card-surface p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative md:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search category or note…"
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
            className="pl-9"
            aria-label="Search transactions"
          />
        </div>

        <div>
          <Select
            value={value.type}
            onValueChange={(v) => set("type", v as FilterState["type"])}
          >
            <SelectTrigger aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            value={value.category}
            onValueChange={(v) => set("category", v)}
          >
            <SelectTrigger aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            value={value.sort}
            onValueChange={(v) => set("sort", v as FilterState["sort"])}
          >
            <SelectTrigger aria-label="Sort order">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-slate-500"
          >
            <X className="h-3.5 w-3.5" />
            Reset filters
          </Button>
        )}
        <p className="text-xs text-slate-400">
          Showing {resultCount} of{" "}
          <span className="font-medium text-slate-500">all transactions</span>
        </p>
      </div>
    </div>
  );
}