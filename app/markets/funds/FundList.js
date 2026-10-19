"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, UserGroupIcon } from "@heroicons/react/20/solid";
import useFetch from "../../hooks/useFetch";
import { Change, EmptyState, ErrorState, Skeleton } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";

function StatusBadges({ fund }) {
  return (
    <div className="flex flex-wrap gap-2">
      {fund.isMember ? (
        <span className="rounded-full border border-bronze/40 px-2 py-0.5 text-xs text-bronze">You're a member</span>
      ) : null}
      {fund.recruiting ? (
        <span className="rounded-full bg-gain/15 px-2 py-0.5 text-xs text-gain">
          Open to new members{fund.recruitEnd ? ` until ${formatDate(fund.recruitEnd, { time: false })}` : ""}
        </span>
      ) : !fund.isMember ? (
        <span className="rounded-full bg-slate px-2 py-0.5 text-xs text-muted">Closed to new members</span>
      ) : null}
    </div>
  );
}

function FundCard({ fund }) {
  return (
    <Link
      href={`/markets/funds/${fund.symbol}`}
      className="flex h-full flex-col rounded-box border border-line bg-basalt/40 p-5 transition-colors hover:border-bronze/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl text-marble">{fund.name}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {fund.symbol}
            {fund.managers.length ? ` · Managed by ${fund.managers.join(", ")}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">{fund.description || "No description yet."}</p>
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <div>
          <dt className="text-xs text-muted">Fund value</dt>
          <dd className="tabular mt-0.5 text-sm font-medium text-marble">{formatCurrency(fund.value, { compact: true })}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Since inception</dt>
          <dd className="mt-0.5 text-sm font-medium"><Change value={fund.returnSinceInception} /></dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Members</dt>
          <dd className="tabular mt-0.5 text-sm font-medium text-marble">{fund.members}</dd>
        </div>
      </dl>
      <div className="mt-4"><StatusBadges fund={fund} /></div>
    </Link>
  );
}

const FILTERS = [
  { key: "all", label: "All funds" },
  { key: "recruiting", label: "Open to new members" },
  { key: "mine", label: "My funds" },
];

// Directory of public funds. `compact` shows a few cards with no filters (markets overview).
export default function FundList({ limit, compact = false }) {
  const { responseJSON, isLoading, error, reload } = useFetch("/api/market/funds");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const funds = useMemo(() => {
    let list = responseJSON?.data || [];
    if (filter === "recruiting") list = list.filter((f) => f.recruiting);
    if (filter === "mine") list = list.filter((f) => f.isMember);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((f) => f.name.toLowerCase().includes(q) || f.symbol.toLowerCase().includes(q));
    return limit ? list.slice(0, limit) : list;
  }, [responseJSON, filter, query, limit]);

  const grid = "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="p-5">
      {!compact ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Filter funds" className="inline-flex rounded-btn border border-line bg-basalt p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-[0.4rem] px-3 py-1.5 text-sm transition-colors ${filter === f.key ? "bg-slate text-marble" : "text-muted hover:text-marble"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <label htmlFor="fund-search" className="sr-only">Search funds</label>
            <input
              id="fund-search"
              className="field py-2 pl-9"
              placeholder="Search by name or symbol"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className={grid}>
          {Array.from({ length: compact ? 3 : 6 }, (_, i) => (
            <div key={i} className="space-y-3 rounded-box border border-line p-5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Funds couldn't be loaded." onRetry={reload} />
      ) : funds.length ? (
        <div className={grid}>
          {funds.map((fund) => <FundCard key={fund.id} fund={fund} />)}
        </div>
      ) : (
        <EmptyState
          title={query || filter !== "all" ? "No funds match" : "No public funds yet"}
          description={query || filter !== "all" ? "Try a different search or filter." : "Start one and invite friends to invest alongside you."}
          action={
            query || filter !== "all" ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button>
            ) : (
              <Link href="/dashboard" className="btn btn-primary btn-sm"><UserGroupIcon className="h-4 w-4" aria-hidden="true" />Start a fund</Link>
            )
          }
        />
      )}
    </div>
  );
}
