"use client"
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import useDebounce from "../hooks/useDebounce";
import { AssetLogo } from "./ui";

const KIND = { CRYPTO: "Crypto", FUNDS: "Fund" };

function routeFor(asset, inFundContext) {
  if (asset.exchange === "CRYPTO") return `/markets/crypto/${asset.symbol.replace("/USD", "-usd").toLowerCase()}`;
  if (asset.exchange === "FUNDS") return `/markets/funds/${asset.symbol}`;
  // Fund managers trade on behalf of their fund from the fund pages
  return inFundContext ? `/fundMarkets/stocks/${asset.symbol}` : `/markets/stocks/${asset.symbol}`;
}

export default function SearchModal({ onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const debounced = useDebounce(query, 200);

  useEffect(() => {
    const term = debounced?.trim();
    if (!term) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Funds are searched with an "F:" prefix; show both kinds for any query
    const fundQuery = term.toUpperCase().startsWith("F:") ? term : "F:" + term;
    Promise.all([
      term.toUpperCase().startsWith("F:") ? Promise.resolve({ data: [] }) :
        fetch("/api/search?query=" + encodeURIComponent(term)).then((r) => r.json()),
      fetch("/api/search?query=" + encodeURIComponent(fundQuery)).then((r) => r.json()),
    ])
      .then(([assets, funds]) => {
        if (!cancelled) {
          setResults([...(assets.data || []), ...(funds.data || [])]);
          setHighlighted(0);
        }
      })
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [debounced]);

  const select = (asset) => {
    const inFundContext = /^\/(dashboard|fundFinances|fundMarkets)/.test(window.location.pathname);
    router.push(routeFor(asset, inFundContext));
    onClose();
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && results[highlighted]) {
      event.preventDefault();
      select(results[highlighted]);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <div onKeyDown={onKeyDown}>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <MagnifyingGlassIcon className="h-5 w-5 text-muted" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by symbol, company or fund"
          autoComplete="off"
          className="h-14 w-full bg-transparent text-base text-marble placeholder:text-muted/70 focus:outline-none"
        />
        {loading ? <span className="loading loading-spinner loading-sm text-muted" /> : null}
      </div>

      <div className="max-h-[50vh] overflow-y-auto p-2">
        {!query.trim() ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            Try AAPL, Bitcoin, or a fund name like Growth.
          </p>
        ) : results.length === 0 && !loading ? (
          <p className="px-3 py-6 text-center text-sm text-muted">No matches for “{query}”.</p>
        ) : (
          results.map((asset, index) => (
            <button
              key={asset.id || asset.symbol + asset.exchange}
              onClick={() => select(asset)}
              onMouseEnter={() => setHighlighted(index)}
              className={`flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-left ${
                highlighted === index ? "bg-slate" : ""
              }`}
            >
              {asset.exchange === "FUNDS" ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bronze/15 font-display text-sm text-bronze">
                  {asset.symbol.slice(0, 1)}
                </span>
              ) : (
                <AssetLogo symbol={asset.symbol} size={32} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-marble">{asset.symbol}</span>
                <span className="block truncate text-xs text-muted">{asset.name}</span>
              </span>
              <span className="text-xs text-muted">{KIND[asset.exchange] || asset.exchange}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
