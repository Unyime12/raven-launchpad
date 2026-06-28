"use client";

import { useState, useMemo } from "react";
import LaunchCard, { type LaunchMeta } from "./LaunchCard";
import LaunchFilters, {
  type FilterStatus,
  type SortKey,
} from "./LaunchFilters";
import { Rocket } from "lucide-react";
import { LAUNCHES } from "../lib/launches";
 

export default function LaunchGrid() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [chainStates, setChainStates] = useState<Record<string, number>>({});

  const handleChainState = (id: string, state: number) => {
    setChainStates((prev) =>
      prev[id] === state ? prev : { ...prev, [id]: state }
    );
  };

  const filtered = useMemo(() => {
    let list = [...LAUNCHES];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.ticker.toLowerCase().includes(q)
      );
    }

    // Status filter 
    if (status !== "all") {
      const stateMap: Record<FilterStatus, number> = {
        all: -1,
        live: 0,
        success: 1,
        ended: 2,
      };
      const target = stateMap[status];
      list = list.filter((l) => {
        const s = chainStates[l.id];
        if (s === undefined) return true;  
        return s === target;
      });
    }

    // Sort
    if (sort === "progress") {
      list.sort((a, b) => {
        const sa = chainStates[a.id] ?? 0;
        const sb = chainStates[b.id] ?? 0;
        return sa - sb;
      });
    } else if (sort === "cap_asc") {
      list.sort((a, b) => a.softCap - b.softCap);
    } else if (sort === "cap_desc") {
      list.sort((a, b) => b.softCap - a.softCap);
    }

    return list;
  }, [search, status, sort, chainStates]);

  return (
    <>
      <LaunchFilters
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        sort={sort}
        onSort={setSort}
        total={LAUNCHES.length}
      />

      <div className="max-w-5xl mx-auto px-4 pb-24">
        {filtered.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <p className="text-zinc-500 text-sm">
              {search
                ? `No launches match "${search}"`
                : "No launches in this category yet."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[11px] text-violet-400 hover:text-violet-300 underline underline-offset-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((launch) => (
              <LaunchCardWrapper
                key={launch.id}
                launch={launch}
                onChainState={handleChainState}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function LaunchCardWrapper({
  launch,
  onChainState,
}: {
  launch: LaunchMeta;
  onChainState: (id: string, state: number) => void;
}) {
  return (
    <LaunchCard
      launch={launch}
      onChainState={(state) => onChainState(launch.id, state)}
    />
  );
}