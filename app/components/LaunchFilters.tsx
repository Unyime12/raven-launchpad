"use client";

import { Search, SlidersHorizontal } from "lucide-react";

export type FilterStatus = "all" | "live" | "success" | "ended";
export type SortKey = "default" | "progress" | "cap_asc" | "cap_desc";

interface LaunchFiltersProps {
  search: string;
  onSearch: (v: string) => void;
  status: FilterStatus;
  onStatus: (v: FilterStatus) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  total: number;
}

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "success", label: "Success" },
  { value: "ended", label: "Ended" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "progress", label: "Most Funded" },
  { value: "cap_asc", label: "Cap: Low → High" },
  { value: "cap_desc", label: "Cap: High → Low" },
];

export default function LaunchFilters({
  search,
  onSearch,
  status,
  onStatus,
  sort,
  onSort,
  total,
}: LaunchFiltersProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 pb-6 space-y-4">
      {/* Tab pills + count */}
      <div className="flex items-center mt-4 gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatus(opt.value)}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase border transition-all
              ${
                status === opt.value
                  ? "bg-[#524981] border-violet-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
              }`}
          >
            {opt.label}
            {opt.value === "all" && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-400 text-[9px]">
                {total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + sort row */}
      <div className="flex gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by token name or ticker…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5
                       text-sm text-zinc-300 placeholder:text-zinc-600
                       outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        {/* Sort */}
        <div className="relative shrink-0">
          <SlidersHorizontal
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
          />
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="appearance-none bg-zinc-900/60 border border-zinc-800 rounded-xl
                       pl-8 pr-8 py-2.5 text-[11px] text-zinc-400 font-bold tracking-wider
                       outline-none focus:border-violet-500/50 transition-colors cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Custom chevron */}
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
          >
            <path
              d="M2 3.5L5 6.5L8 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
