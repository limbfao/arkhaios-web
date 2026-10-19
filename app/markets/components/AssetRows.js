"use client";

import Link from "next/link";
import { AssetLogo, Change } from "../../components/ui";
import { formatCurrency } from "../../lib/format";
import Sparkline from "./Sparkline";
import { assetHref, displaySymbol } from "./symbols";

// Compact clickable rows (logo, ticker/name, sparkline, price, change) from /api/market/snapshot data
export default function AssetRows({ items, sparkline = true, trailing }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.symbol} className="group flex items-center">
          <Link
            href={assetHref(item.symbol)}
            className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5 pr-4 transition-colors hover:bg-slate/60"
          >
            <AssetLogo symbol={item.symbol} size={32} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-marble">{displaySymbol(item.symbol)}</div>
              <div className="truncate text-xs text-muted">{item.name}</div>
            </div>
            {sparkline ? (
              <Sparkline values={item.sparkline} reference={item.previousClose} up={Number.isFinite(item.changePercent) ? item.changePercent >= 0 : undefined} width={56} height={24} className="hidden shrink-0 sm:block" />
            ) : null}
            <div className="w-[5.5rem] shrink-0 text-right">
              <div className="tabular text-sm text-marble">{formatCurrency(item.price)}</div>
              <Change value={item.changePercent} className="text-xs" />
            </div>
          </Link>
          {trailing ? trailing(item) : null}
        </li>
      ))}
    </ul>
  );
}
