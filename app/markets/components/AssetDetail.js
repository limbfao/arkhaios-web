"use client";

import Link from "next/link";
import { useContext } from "react";
import { ChevronLeftIcon } from "@heroicons/react/20/solid";
import UserContext from "../../UserContext";
import useFetch from "../../hooks/useFetch";
import { AssetLogo, EmptyState, Skeleton, SkeletonRows, Panel } from "../../components/ui";
import AssetRows from "./AssetRows";
import AssetChart from "./AssetChart";
import OrderTicket from "./OrderTicket";
import PositionPanel from "./PositionPanel";
import WatchButton from "./WatchButton";
import { displaySymbol, toChartSymbol, toPositionSymbol } from "./symbols";
import StockStats from "../stocks/stockStats";
import StockNews from "../stocks/stockNews";
import CompanyPeers from "../stocks/companyPeers";
import CryptoStats from "../crypto/cryptoStats";

const CRYPTO = ["BTC-USD", "ETH-USD", "SOL-USD"];

function OtherCrypto({ symbol }) {
  const others = CRYPTO.filter((s) => s !== symbol);
  const { responseJSON, isLoading } = useFetch("/api/market/snapshot?symbols=" + others.join(","));
  if (!isLoading && !responseJSON?.data?.length) return null;
  return (
    <Panel title="Other crypto" bodyClassName="">
      {isLoading ? <div className="p-5"><SkeletonRows rows={2} /></div> : <AssetRows items={responseJSON.data} sparkline={false} />}
    </Panel>
  );
}

// Detail page for a stock or crypto asset: chart, stats, news, order ticket and position
export default function AssetDetail({ symbol: rawSymbol, kind }) {
  const { user } = useContext(UserContext);
  const verified = Boolean(user?.kycVerified);
  const symbol = toChartSymbol(rawSymbol);
  const ticker = displaySymbol(symbol);
  const isCrypto = kind === "crypto";

  const snapshot = useFetch("/api/market/snapshot?symbols=" + encodeURIComponent(symbol));
  const trading = useFetch(verified ? "/api/account/trading" : null);
  const position = useFetch(verified ? "/api/positions?symbol=" + encodeURIComponent(toPositionSymbol(symbol)) : null);

  const asset = snapshot.responseJSON?.data?.[0];
  const notFound = !snapshot.isLoading && !snapshot.error && !asset;
  const heldPosition = position.responseJSON?.data && parseFloat(position.responseJSON.data.qty) > 0 ? position.responseJSON.data : null;

  function refreshAccount() {
    trading.reload();
    position.reload();
  }

  if (notFound) {
    return (
      <div className="page">
        <div className="panel">
          <EmptyState
            title={`We couldn't find ${ticker}`}
            description="Check the symbol, or search for a stock, crypto or fund from the bar at the top."
            action={<Link href="/markets" className="btn btn-primary btn-sm">Browse markets</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Link href="/markets" className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-marble">
        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        Markets
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <AssetLogo symbol={symbol} size={48} />
          <div className="min-w-0">
            {asset ? (
              <h1 className="page-title truncate">{asset.name}</h1>
            ) : (
              <Skeleton className="h-10 w-64" />
            )}
            <p className="mt-1 text-sm text-muted">
              {ticker}
              {asset?.exchange ? <span> · {isCrypto ? "Cryptocurrency" : asset.exchange}</span> : null}
            </p>
          </div>
        </div>
        <WatchButton symbol={symbol} />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <AssetChart symbol={symbol} previousClose={asset?.previousClose} price={asset?.price} isCrypto={isCrypto} />
          {isCrypto ? (
            <CryptoStats symbol={symbol} previousClose={asset?.previousClose} />
          ) : (
            <StockStats symbol={symbol} price={asset?.price} />
          )}
          <StockNews symbol={isCrypto ? ticker : symbol} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <OrderTicket
            symbol={symbol}
            price={asset?.price}
            isCrypto={isCrypto}
            verified={verified}
            trading={trading.responseJSON?.data}
            tradingLoading={trading.isLoading}
            position={heldPosition}
            onPlaced={refreshAccount}
          />
          <PositionPanel position={heldPosition} isCrypto={isCrypto} ticker={ticker} />
          {isCrypto ? <OtherCrypto symbol={symbol} /> : <CompanyPeers symbol={symbol} />}
        </aside>
      </div>
    </div>
  );
}
