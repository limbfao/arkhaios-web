"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/20/solid";
import useFetch from "../hooks/useFetch";
import { EmptyState, ErrorState, Panel, SkeletonRows } from "../components/ui";
import AssetRows from "../markets/components/AssetRows";
import { displaySymbol, toChartSymbol } from "../markets/components/symbols";

// Symbols the user follows, with live price and daily change
export default function Watchlist() {
  const list = useFetch("/api/account/watchlist");
  const [symbols, setSymbols] = useState(null);

  useEffect(() => {
    if (list.responseJSON?.data) setSymbols(list.responseJSON.data);
  }, [list.responseJSON]);

  const query = symbols?.length ? symbols.map(toChartSymbol).join(",") : null;
  const snapshot = useFetch(query ? "/api/market/snapshot?symbols=" + query : null);
  const items = (snapshot.responseJSON?.data || []).filter((item) => symbols?.some((s) => toChartSymbol(s) === item.symbol));

  async function remove(item) {
    const original = symbols.find((s) => toChartSymbol(s) === item.symbol) ?? item.symbol;
    setSymbols((current) => current.filter((s) => s !== original));
    try {
      const r = await fetch("/api/account/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: original }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setSymbols((current) => [...current, original]);
    }
  }

  let body;
  if (list.isLoading || (symbols?.length && snapshot.isLoading && !items.length)) body = <div className="p-5"><SkeletonRows rows={4} /></div>;
  else if (list.error || snapshot.error) body = <ErrorState message="Your watchlist couldn't be loaded." onRetry={() => { list.reload(); snapshot.reload(); }} />;
  else if (!symbols?.length)
    body = (
      <EmptyState
        title="Your watchlist is empty"
        description="Follow stocks and crypto by selecting Add to watchlist on their page."
        action={<Link href="/markets" className="btn btn-ghost btn-sm border border-line">Browse markets</Link>}
      />
    );
  else
    body = (
      <AssetRows
        items={items}
        trailing={(item) => (
          <button
            type="button"
            onClick={() => remove(item)}
            className="mr-3 rounded p-1 text-muted opacity-0 transition-opacity hover:text-marble focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Remove ${displaySymbol(item.symbol)} from watchlist`}
            title="Remove from watchlist"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      />
    );

  return (
    <Panel
      title="Watchlist"
      actions={symbols?.length ? <span className="text-xs text-muted">{symbols.length} {symbols.length === 1 ? "symbol" : "symbols"}</span> : null}
      bodyClassName=""
    >
      {body}
    </Panel>
  );
}
