"use client";

import Link from "next/link";
import { useCallback, useContext, useEffect, useState } from "react";
import UserContext from "../../UserContext";
import { Badge, Card, DetailList, DetailRow, Spinner, Toast, VerifyNotice, fetchJSON, useToast } from "../accountUi";
import { AssetLogo, Change, EmptyState, ErrorState, Skeleton, SkeletonRows } from "../../components/ui";
import { formatCurrency, formatNumber } from "../../lib/format";

function useData(url, enabled, pick = (d) => d.data) {
  const [state, setState] = useState({ loading: true, error: false, data: null });
  const load = useCallback(async () => {
    setState({ loading: true, error: false, data: null });
    try {
      setState({ loading: false, error: false, data: pick(await fetchJSON(url)) });
    } catch (e) {
      setState({ loading: false, error: true, data: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  useEffect(() => { if (enabled) load(); }, [enabled, load]);
  return { ...state, reload: load };
}

function assetHref(p) {
  if (p.asset_class === "crypto") return `/markets/crypto/${p.symbol.replace(/\/?USD$/, "").toLowerCase()}-usd`;
  return `/markets/stocks/${p.symbol}`;
}

export default function Page() {
  const { user } = useContext(UserContext);
  const verified = Boolean(user.kycVerified);
  const trading = useData("/api/account/trading", verified);
  const positions = useData("/api/positions", verified, (d) => d.data || []);
  const funds = useData("/api/fund/list", verified, (d) => d.data?.funds || []);
  const [enabling, setEnabling] = useState(false);
  const [toast, showToast] = useToast();

  if (!verified) return <VerifyNotice feature="investing features" />;

  const t = trading.data;
  const cryptoActive = t?.crypto_status === "ACTIVE";
  const multiplier = parseFloat(t?.multiplier) || (parseFloat(t?.buying_power) > parseFloat(t?.cash) ? 2 : 1);
  const holdings = (positions.data || []).slice().sort((a, b) => parseFloat(b.market_value) - parseFloat(a.market_value));
  const totalValue = holdings.reduce((sum, p) => sum + parseFloat(p.market_value || 0), 0);

  async function enableCrypto() {
    setEnabling(true);
    try {
      await fetchJSON("/api/account/enable-crypto", { method: "POST", body: {} });
      showToast("Crypto trading requested");
      trading.reload();
    } catch (e) {
      showToast("Crypto trading couldn't be enabled. Try again.", "error");
    } finally {
      setEnabling(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card
        title="Holdings"
        description={positions.data ? `${holdings.length} positions · ${formatCurrency(totalValue)}` : null}
        actions={<Link href="/home" className="btn btn-ghost btn-xs text-muted">View portfolio</Link>}
        className="lg:col-span-2 lg:row-span-2 self-start"
        bodyClassName=""
      >
        {positions.loading ? (
          <div className="p-5"><SkeletonRows rows={5} /></div>
        ) : positions.error ? (
          <ErrorState message="Your holdings couldn't be loaded." onRetry={positions.reload} />
        ) : holdings.length === 0 ? (
          <EmptyState
            title="You don't own anything yet"
            description="Search for a stock or crypto asset to place your first order."
            action={<Link href="/markets" className="btn btn-primary btn-sm">Explore markets</Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="border-line text-xs text-muted">
                  <th className="pl-5 font-normal">Asset</th>
                  <th className="text-right font-normal">Quantity</th>
                  <th className="text-right font-normal">Price</th>
                  <th className="text-right font-normal">Value</th>
                  <th className="text-right font-normal">Allocation</th>
                  <th className="pr-5 text-right font-normal">Total return</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((p) => (
                  <tr key={p.asset_id || p.symbol} className="border-line hover:bg-slate/40">
                    <td className="pl-5">
                      <Link href={assetHref(p)} className="flex items-center gap-3 hover:text-bronze-light">
                        <AssetLogo symbol={p.symbol} size={32} />
                        <span className="text-sm font-medium text-marble">{p.asset_class === "crypto" ? p.symbol.replace(/\/?USD$/, "") : p.symbol}</span>
                      </Link>
                    </td>
                    <td className="text-right text-sm text-muted">{formatNumber(p.qty)}</td>
                    <td className="text-right text-sm text-muted">{formatCurrency(p.current_price)}</td>
                    <td className="text-right text-sm text-marble">{formatCurrency(p.market_value)}</td>
                    <td className="text-right text-sm text-muted tabular">
                      {totalValue ? `${((parseFloat(p.market_value) / totalValue) * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="pr-5 text-right text-sm"><Change value={p.unrealized_plpc} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Trading permissions">
        {trading.loading ? (
          <div className="space-y-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
        ) : trading.error ? (
          <ErrorState message="Permissions couldn't be loaded." onRetry={trading.reload} />
        ) : (
          <DetailList>
            <DetailRow label="Stocks and ETFs">
              <Badge tone={t?.trading_blocked ? "loss" : "gain"}>{t?.trading_blocked ? "Blocked" : "Enabled"}</Badge>
            </DetailRow>
            <DetailRow label="Crypto">
              {cryptoActive ? (
                <Badge tone="gain">Enabled</Badge>
              ) : t?.crypto_status && t.crypto_status !== "INACTIVE" ? (
                <Badge tone="bronze">Under review</Badge>
              ) : (
                <button className="btn btn-primary btn-xs" onClick={enableCrypto} disabled={enabling}>
                  {enabling ? <Spinner className="h-3 w-3" /> : null} Enable crypto
                </button>
              )}
            </DetailRow>
            <DetailRow label="Account type">{multiplier > 1 ? `Margin (${multiplier}x)` : "Cash"}</DetailRow>
            <DetailRow label="Day trades, last 5 days">
              <span className="tabular">{t?.daytrade_count ?? 0} of 3</span>
            </DetailRow>
            <DetailRow label="Pattern day trader">{t?.pattern_day_trader ? "Yes" : "No"}</DetailRow>
          </DetailList>
        )}
      </Card>

      <Card
        title="Your funds"
        actions={<Link href="/markets/funds" className="btn btn-ghost btn-xs text-muted">Explore funds</Link>}
        bodyClassName="p-2"
        className="self-start"
      >
        {funds.loading ? (
          <div className="p-3"><SkeletonRows rows={2} /></div>
        ) : funds.error ? (
          <ErrorState message="Your funds couldn't be loaded." onRetry={funds.reload} />
        ) : funds.data.length === 0 ? (
          <EmptyState
            title="Not in any funds yet"
            description="Join a fund run by a portfolio manager, or start your own."
            action={<Link href="/markets/funds" className="btn btn-primary btn-sm">Browse funds</Link>}
          />
        ) : (
          <ul>
            {funds.data.map((fund) => (
              <li key={fund.id} className="flex items-center justify-between gap-3 rounded-btn px-3 py-3">
                <span className="truncate font-display text-lg text-marble">{fund.name}</span>
                <Badge tone={fund.role === "manager" ? "bronze" : "muted"}>
                  {fund.role === "manager" ? "Portfolio manager" : "Investor"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Toast toast={toast} />
    </div>
  );
}
