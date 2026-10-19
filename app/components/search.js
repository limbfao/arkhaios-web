"use client"
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, ClockIcon, XMarkIcon } from "@heroicons/react/24/outline";
import useDebounce from "../hooks/useDebounce";
import { AssetLogo } from "./ui";
import { changeColor, formatCurrency, formatPercent } from "../lib/format";

const RECENT_KEY = "arkhaios:recent-searches";
const POPULAR = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ" },
  { symbol: "BTC/USD", name: "Bitcoin", exchange: "CRYPTO" },
  { symbol: "ETH/USD", name: "Ethereum", exchange: "CRYPTO" },
];
const GROUPS = [
  { key: "stocks", label: "Stocks", test: (a) => a.exchange !== "CRYPTO" && a.exchange !== "FUNDS" },
  { key: "crypto", label: "Crypto", test: (a) => a.exchange === "CRYPTO" },
  { key: "funds", label: "Funds", test: (a) => a.exchange === "FUNDS" },
];

// "BTC/USD" -> "BTC-USD", the form the price APIs use
const priceSymbol = (symbol) => symbol.replace("/", "-").toUpperCase();
const keyOf = (asset) => `${asset.exchange}:${asset.symbol}`;

function routeFor(asset) {
  if (asset.exchange === "CRYPTO") return `/markets/crypto/${asset.symbol.replace("/USD", "-usd").toLowerCase()}`;
  if (asset.exchange === "FUNDS") return `/markets/funds/${asset.symbol}`;
  // Fund managers trade on behalf of their fund from the fund pages
  const inFundContext = /^\/(dashboard|fundFinances|fundMarkets)/.test(window.location.pathname);
  return inFundContext ? `/fundMarkets/stocks/${asset.symbol}` : `/markets/stocks/${asset.symbol}`;
}

function readRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}

function saveRecent(asset) {
  try {
    const entry = { symbol: asset.symbol, name: asset.name, exchange: asset.exchange };
    const list = [entry, ...readRecent().filter((a) => keyOf(a) !== keyOf(entry))].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.status);
  return response.json();
}

export default function Search() {
  const router = useRouter();
  const listId = useId();
  const box = useRef(null);
  const input = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [recent, setRecent] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [active, setActive] = useState(0);
  const debounced = useDebounce(query, 150);
  const term = debounced.trim();

  // Keyboard shortcuts: "/" or Cmd/Ctrl+K focus the search field
  useEffect(() => {
    const onKeyDown = (event) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
        || document.activeElement?.isContentEditable;
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!box.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) setRecent(readRecent());
  }, [open]);

  // Stocks/crypto and funds are separate searches; run both
  useEffect(() => {
    if (!term) {
      setResults([]);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    Promise.all([
      getJSON("/api/search?query=" + encodeURIComponent(term)),
      getJSON("/api/search?query=" + encodeURIComponent("F:" + term)),
    ])
      .then(([assets, funds]) => {
        if (cancelled) return;
        const seen = new Set();
        const merged = [...(assets.data || []), ...(funds.data || [])].filter((a) => {
          const key = keyOf(a);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setResults(merged);
        setFailed(false);
        setActive(0);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setFailed(true);
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [term]);

  const showingSuggestions = !query.trim();
  const groups = useMemo(() => {
    if (showingSuggestions) {
      return [
        ...(recent.length ? [{ key: "recent", label: "Recent", items: recent, recent: true }] : []),
        { key: "popular", label: "Popular", items: POPULAR.filter((p) => !recent.some((r) => keyOf(r) === keyOf(p))) },
      ].filter((g) => g.items.length);
    }
    return GROUPS.map((g) => ({ ...g, items: results.filter(g.test) })).filter((g) => g.items.length);
  }, [showingSuggestions, recent, results]);

  const items = groups.flatMap((g) => g.items);

  // Live price and today's change for whatever stocks and crypto are listed
  const priceKey = items.filter((a) => a.exchange !== "FUNDS").map((a) => priceSymbol(a.symbol)).join(",");
  useEffect(() => {
    if (!open || !priceKey) return;
    const missing = priceKey.split(",").filter((s) => !(s in quotes));
    if (!missing.length) return;
    getJSON("/api/market/snapshot?symbols=" + encodeURIComponent(missing.join(",")))
      .then((json) => {
        const next = {};
        for (const s of missing) next[s] = null;
        for (const q of json.data || []) next[priceSymbol(q.symbol)] = q;
        setQuotes((current) => ({ ...current, ...next }));
      })
      .catch(() => {});
  }, [open, priceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(items.length - 1, 0)));
  }, [items.length]);

  function select(asset) {
    saveRecent(asset);
    setOpen(false);
    setQuery("");
    input.current?.blur();
    router.push(routeFor(asset));
  }

  function clearRecent() {
    try { localStorage.removeItem(RECENT_KEY); } catch {}
    setRecent([]);
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (event.key === "Enter" && open && items[active]) {
      event.preventDefault();
      select(items[active]);
    } else if (event.key === "Escape") {
      if (query) setQuery("");
      else {
        setOpen(false);
        input.current?.blur();
      }
    }
  }

  const optionId = (index) => `${listId}-option-${index}`;
  let index = -1;

  return (
    <div ref={box} className="relative w-full max-w-lg">
      <div
        className={`flex h-10 items-center gap-2.5 rounded-btn border px-3 transition-colors ${
          open ? "border-bronze/60 bg-basalt" : "border-line bg-stone hover:border-muted/50"
        }`}
      >
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && items[active] ? optionId(active) : undefined}
          aria-label="Search stocks, crypto and funds"
          placeholder="Search stocks, crypto and funds"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-marble placeholder:text-muted focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => { setQuery(""); input.current?.focus(); }}
            className="rounded p-0.5 text-muted hover:text-marble"
            aria-label="Clear search"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="hidden rounded border border-line px-1.5 text-xs text-muted sm:block">/</kbd>
        )}
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-[120] mt-2 overflow-hidden rounded-box border border-line bg-stone shadow-[0_16px_48px_-12px_rgba(0,0,0,0.7)]"
        >
          <div className="max-h-[min(28rem,70vh)] overflow-y-auto py-1.5">
            {groups.map((group) => (
              <div key={group.key} role="group" aria-label={group.label} className="py-1">
                <div className="flex items-center justify-between px-4 pb-1 pt-1.5">
                  <span className="text-xs font-medium text-muted">{group.label}</span>
                  {group.recent ? (
                    <button type="button" onClick={clearRecent} className="text-xs text-muted hover:text-marble">
                      Clear
                    </button>
                  ) : null}
                </div>
                {group.items.map((asset) => {
                  index += 1;
                  const i = index;
                  const quote = quotes[priceSymbol(asset.symbol)];
                  const isFund = asset.exchange === "FUNDS";
                  return (
                    <div
                      key={keyOf(asset)}
                      id={optionId(i)}
                      role="option"
                      aria-selected={active === i}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => select(asset)}
                      onMouseMove={() => active !== i && setActive(i)}
                      className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-btn px-2.5 py-2 ${
                        active === i ? "bg-slate" : ""
                      }`}
                    >
                      {group.recent ? (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-muted">
                          <ClockIcon className="h-4 w-4" />
                        </span>
                      ) : isFund ? (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bronze/15 font-display text-sm text-bronze">
                          {asset.symbol.slice(0, 1)}
                        </span>
                      ) : (
                        <AssetLogo symbol={asset.symbol} size={32} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-marble">{asset.symbol.replace("/USD", "")}</span>
                        <span className="block truncate text-xs text-muted">{asset.name}</span>
                      </span>
                      {isFund ? (
                        <span className="text-xs text-muted">Fund</span>
                      ) : quote ? (
                        <span className="text-right">
                          <span className="tabular block text-sm text-marble">{formatCurrency(quote.price)}</span>
                          <span className={`tabular block text-xs ${changeColor(quote.changePercent)}`}>
                            {formatPercent(quote.changePercent)}
                          </span>
                        </span>
                      ) : quote === undefined ? (
                        <span className="h-8 w-16 animate-pulse rounded bg-slate/60" aria-hidden="true" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}

            {!showingSuggestions && !groups.length ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                {loading ? "Searching…" : failed ? "Search isn't available right now. Try again in a moment." : `No matches for “${query.trim()}”.`}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-xs text-muted">
            <span><kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to move</span>
            <span><kbd className="font-sans">Enter</kbd> to open</span>
            <span><kbd className="font-sans">Esc</kbd> to close</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
