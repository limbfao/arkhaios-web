"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import useFetch from "../hooks/useFetch";
import { AssetLogo, Change, EmptyState, ErrorState, PageHeader, Panel, Skeleton, SkeletonRows } from "../components/ui";
import { changeColor, formatCurrency, formatPercent, formatSignedCurrency } from "../lib/format";
import Sparkline from "./components/Sparkline";
import AssetRows from "./components/AssetRows";
import FundList from "./funds/FundList";
import { assetHref, displaySymbol } from "./components/symbols";

const INDEXES = [
  { symbol: "SPY", label: "S&P 500", note: "SPY" },
  { symbol: "QQQ", label: "Nasdaq 100", note: "QQQ" },
  { symbol: "BTC-USD", label: "Bitcoin", note: "BTC" },
];

function IndexCard({ item, label, note }) {
  return (
    <Link
      href={assetHref(item.symbol)}
      className="panel flex items-center justify-between gap-4 p-5 transition-colors hover:border-bronze/40"
    >
      <div className="min-w-0">
        <div className="text-sm text-muted">
          {label} <span className="text-muted/70">· {note}</span>
        </div>
        <div className="stat-value mt-1 text-2xl font-semibold text-marble">{formatCurrency(item.price)}</div>
        <div className={`tabular mt-0.5 text-sm ${changeColor(item.change)}`}>
          {formatSignedCurrency(item.change)} ({formatPercent(item.changePercent)})
        </div>
      </div>
      <Sparkline values={item.sparkline} reference={item.previousClose} up={Number.isFinite(item.changePercent) ? item.changePercent >= 0 : undefined} width={120} height={48} className="shrink-0" />
    </Link>
  );
}

function IndexSkeleton() {
  return (
    <div className="panel flex items-center justify-between p-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-12 w-[120px]" />
    </div>
  );
}

const COLUMNS = [
  { key: "symbol", label: "Name", align: "left" },
  { key: "trend", label: "Today", align: "left", sortable: false, className: "hidden md:table-cell" },
  { key: "price", label: "Price", align: "right" },
  { key: "change", label: "Change", align: "right", className: "hidden sm:table-cell" },
  { key: "changePercent", label: "Change %", align: "right" },
];

function StocksTable({ items }) {
  const [sort, setSort] = useState({ key: "symbol", dir: "asc" });

  const sorted = useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "string" ? av.localeCompare(bv) : (av ?? -Infinity) - (bv ?? -Infinity);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [items, sort]);

  function toggle(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "symbol" ? "asc" : "desc" }));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                className={`px-5 py-2.5 font-normal ${c.align === "right" ? "text-right" : "text-left"} ${c.className || ""}`}
              >
                {c.sortable === false ? (
                  c.label
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(c.key)}
                    className={`inline-flex items-center gap-1 hover:text-marble ${sort.key === c.key ? "text-marble" : ""}`}
                  >
                    {c.label}
                    {sort.key === c.key ? (
                      sort.dir === "asc" ? <ChevronUpIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : null}
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((item) => (
            <tr key={item.symbol} className="group relative transition-colors hover:bg-slate/60">
              <td className="px-5 py-3">
                <Link href={assetHref(item.symbol)} className="flex items-center gap-3 after:absolute after:inset-0">
                  <AssetLogo symbol={item.symbol} size={32} />
                  <span className="min-w-0">
                    <span className="block font-medium text-marble">{displaySymbol(item.symbol)}</span>
                    <span className="block max-w-[14rem] truncate text-xs text-muted">{item.name}</span>
                  </span>
                </Link>
              </td>
              <td className="hidden px-5 py-3 md:table-cell">
                <Sparkline values={item.sparkline} reference={item.previousClose} up={Number.isFinite(item.changePercent) ? item.changePercent >= 0 : undefined} width={96} height={28} />
              </td>
              <td className="px-5 py-3 text-right text-marble">{formatCurrency(item.price)}</td>
              <td className={`hidden px-5 py-3 text-right sm:table-cell ${changeColor(item.change)}`}>{formatSignedCurrency(item.change)}</td>
              <td className="px-5 py-3 text-right"><Change value={item.changePercent} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Movers({ title, items, isLoading }) {
  return (
    <Panel title={title} bodyClassName="">
      {isLoading ? <div className="p-5"><SkeletonRows rows={4} /></div> : items.length ? <AssetRows items={items} sparkline={false} /> : <EmptyState title="Nothing to show yet" />}
    </Panel>
  );
}

export default function MarketsOverview() {
  const { responseJSON, isLoading, error, reload } = useFetch("/api/market/snapshot");
  const all = responseJSON?.data || [];
  const bySymbol = Object.fromEntries(all.map((a) => [a.symbol, a]));
  const stocks = all.filter((a) => a.assetClass !== "crypto" && !["SPY", "QQQ"].includes(a.symbol));
  const crypto = all.filter((a) => a.assetClass === "crypto");
  const ranked = [...stocks].filter((s) => Number.isFinite(s.changePercent)).sort((a, b) => b.changePercent - a.changePercent);
  const gainers = ranked.filter((s) => s.changePercent > 0).slice(0, 5);
  const losers = ranked.filter((s) => s.changePercent < 0).reverse().slice(0, 5);

  return (
    <div className="page">
      <PageHeader title="Markets" subtitle="Stocks, crypto and investment funds, with today's prices and moves." />

      {error ? (
        <div className="panel mb-6">
          <ErrorState message="Market prices couldn't be loaded." onRetry={reload} />
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {INDEXES.map((idx) =>
          isLoading ? <IndexSkeleton key={idx.symbol} /> : bySymbol[idx.symbol] ? <IndexCard key={idx.symbol} item={bySymbol[idx.symbol]} label={idx.label} note={idx.note} /> : null
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Stocks" bodyClassName="" actions={<span className="text-xs text-muted">Select a column to sort</span>}>
          {isLoading ? <div className="p-5"><SkeletonRows rows={8} /></div> : stocks.length ? <StocksTable items={stocks} /> : <EmptyState title="No stocks to show" />}
        </Panel>

        <div className="space-y-6">
          <Movers title="Top gainers today" items={gainers} isLoading={isLoading} />
          <Movers title="Top losers today" items={losers} isLoading={isLoading} />
          <Panel title="Crypto" bodyClassName="">
            {isLoading ? <div className="p-5"><SkeletonRows rows={3} /></div> : <AssetRows items={crypto} />}
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <Panel
          title="Investment funds"
          bodyClassName=""
          actions={<Link href="/markets/funds" className="btn btn-ghost btn-sm text-bronze">View all funds</Link>}
        >
          <FundList limit={3} compact />
        </Panel>
      </div>
    </div>
  );
}
