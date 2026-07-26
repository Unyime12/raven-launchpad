"use client";

import { useState, useMemo, useEffect } from "react";
import LaunchCard, { type LaunchMeta } from "./LaunchCard";
import LaunchFilters, {
  type FilterStatus,
  type SortKey,
} from "./LaunchFilters";
import { Loader2 } from "lucide-react";
import { LAUNCHES as SEED_LAUNCHES } from "../lib/launches";

const PAGE_SIZE = 6;

export default function LaunchGrid() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [chainStates, setChainStates] = useState<Record<string, number>>({});
  const [dynamicLaunches, setDynamicLaunches] = useState<LaunchMeta[]>([]);

  // pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleChainState = (id: string, state: number) => {
    setChainStates((prev) =>
      prev[id] === state ? prev : { ...prev, [id]: state }
    );
  };

  useEffect(() => {
    fetch("/api/launches", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: LaunchMeta[]) => {
        setDynamicLaunches(Array.isArray(data) ? data : []);
      })
      .catch(() => setDynamicLaunches([]));
  }, []);

  // Combine + dedupe by id 
  const allLaunches = useMemo(() => {
    if (dynamicLaunches.length > 0) return dynamicLaunches;
    return SEED_LAUNCHES; // fallback while fetch is in flight or on error
  }, [dynamicLaunches]);

  const filtered = useMemo(() => {
    let list = [...allLaunches];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) || l.ticker.toLowerCase().includes(q)
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
  }, [allLaunches, search, status, sort, chainStates]);

 
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, status, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleViewAll = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(filtered.length);
      setLoadingMore(false);
    }, 500);
  };

  return (
    <>
      <LaunchFilters
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        sort={sort}
        onSort={setSort}
        total={allLaunches.length}
      />

      <div className="max-w-5xl mx-auto px-4 pb-16">
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
            {visible.map((launch) => (
              <LaunchCardWrapper
                key={launch.id}
                launch={launch}
                onChainState={handleChainState}
              />
            ))}
          </div>
        )}

        {/* View All Launches */}
        {filtered.length > 0 && (
          <div className="pt-10 flex justify-center">
            {hasMore ? (
              <button
                onClick={handleViewAll}
                disabled={loadingMore}
                className="flex items-center gap-2 text-sm font-bold text-zinc-400 
                  hover:text-violet-400 transition-colors disabled:opacity-60 
                  disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
       
                  </>
                ) : (
                  `View All Launches`
                )}
              </button>
            ) : (
    <></>
            )}
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