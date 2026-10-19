"use client";

// The PM trading a stock on behalf of their fund

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/20/solid";
import useFetch from "../../hooks/useFetch";
import { AssetLogo, EmptyState, ErrorState, Panel, Skeleton, SkeletonRows } from "../../components/ui";
import { changeColor, formatCurrency, formatNumber, formatPercent, formatSignedCurrency } from "../../lib/format";
import AssetChart from "../../markets/components/AssetChart";
import StockNews from "../../markets/stocks/stockNews";
import FundOrderTicket from "./FundOrderTicket";

export default function FundTrade({ fund, symbol }) {
  const router = useRouter();
  const snapshot = useFetch(`/api/market/snapshot?symbols=${encodeURIComponent(symbol)}`);
  const position = useFetch(`/api/positions?fund=${encodeURIComponent(fund.fundID)}&symbol=${encodeURIComponent(symbol)}`);

  const asset = snapshot.responseJSON?.data?.[0];
  const held = position.responseJSON?.data?.[0] || null;
  const cash = parseFloat(fund.availableBalance) || 0;

  if (!snapshot.isLoading && !snapshot.error && !asset) {
    return (
      <div className="page">
        <div className="panel">
          <EmptyState title={`We couldn't find ${symbol}`}
            description="Check the symbol and try again."
            action={<Link href="/fundFinances" className="btn btn-primary btn-sm">Back to fund finances</Link>} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Link href="/fundFinances" className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-marble">
        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        Fund finances
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <AssetLogo symbol={symbol} size={48} />
          <div className="min-w-0">
            {asset ? <h1 className="page-title truncate">{asset.name || symbol}</h1> : <Skeleton className="h-10 w-64" />}
            <p className="mt-1 text-sm text-muted">{symbol}{asset?.exchange ? ` · ${asset.exchange}` : ""}</p>
          </div>
        </div>
        <div className="rounded-box border border-line bg-stone px-4 py-2.5 text-right">
          <div className="text-xs text-muted">Trading as {fund.fundName}</div>
          <div className="tabular text-sm text-marble">{formatCurrency(cash)} cash available</div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <AssetChart symbol={symbol} previousClose={asset?.previousClose} price={asset?.price} />
          <StockNews symbol={symbol} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <FundOrderTicket
            fund={fund}
            symbol={symbol}
            price={asset?.price}
            cash={cash}
            heldShares={held ? parseFloat(held.shares) || 0 : 0}
            onPlaced={() => { position.reload(); router.refresh(); }}
          />
          <Panel title="Fund position">
            {position.isLoading ? <SkeletonRows rows={2} /> : position.error ? (
              <ErrorState message="The fund's position couldn't be loaded." onRetry={position.reload} />
            ) : held ? (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Item label="Shares" value={formatNumber(held.shares)} />
                <Item label="Market value" value={formatCurrency(held.market_value)} />
                <Item label="Average price" value={formatCurrency(held.avg_entry_price)} />
                <Item label="Total P/L" value={
                  <span className={changeColor(held.unrealized_pl)}>
                    {formatSignedCurrency(held.unrealized_pl)} <span className="text-xs">({formatPercent(held.unrealized_plpc)})</span>
                  </span>
                } />
              </dl>
            ) : (
              <p className="text-sm text-muted">The fund doesn&apos;t hold {symbol} yet.</p>
            )}
          </Panel>
          <FundPeers symbol={symbol} />
        </aside>
      </div>
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-marble">{value}</dd>
    </div>
  );
}

// Similar companies, linking to the fund ticket rather than the personal one
function FundPeers({ symbol }) {
  const peers = useFetch(`/api/company-peers?symbol=${encodeURIComponent(symbol)}`);
  const list = (peers.responseJSON?.data || []).filter((s) => s && s !== symbol && !s.includes("-")).slice(0, 5);
  const snapshot = useFetch(list.length ? `/api/market/snapshot?symbols=${list.join(",")}` : null);
  const items = snapshot.responseJSON?.data || [];

  if (!peers.isLoading && !snapshot.isLoading && !items.length) return null;

  return (
    <Panel title="Similar companies" bodyClassName="">
      {peers.isLoading || snapshot.isLoading ? <div className="p-5"><SkeletonRows rows={3} /></div> : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.symbol}>
              <Link href={`/fundMarkets/stocks/${encodeURIComponent(item.symbol)}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate/40">
                <AssetLogo symbol={item.symbol} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-marble">{item.symbol}</div>
                  <div className="truncate text-xs text-muted">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="tabular text-sm text-marble">{formatCurrency(item.price)}</div>
                  <div className={`tabular text-xs ${changeColor(item.changePercent)}`}>{formatPercent(item.changePercent)}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
