"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AssetLogo, EmptyState, ErrorState, Panel, SkeletonRows } from "../components/ui";
import { formatCurrency, formatDate, formatNumber, timeAgo } from "../lib/format";
import { assetHref, displaySymbol, toChartSymbol } from "../markets/components/symbols";

const OPEN = ["new", "accepted", "pending_new", "partially_filled", "held", "accepted_for_bidding", "pending_replace"];
const CLOSED_BAD = ["canceled", "expired", "rejected", "pending_cancel", "done_for_day", "stopped", "suspended"];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "filled", label: "Filled" },
  { key: "canceled", label: "Canceled" },
];

const STATUS_LABEL = {
  new: "Open", accepted: "Open", pending_new: "Pending", partially_filled: "Partially filled", held: "Held",
  filled: "Filled", canceled: "Canceled", pending_cancel: "Canceling", expired: "Expired", rejected: "Rejected",
  done_for_day: "Done for day", replaced: "Replaced",
};

function StatusBadge({ status }) {
  const label = STATUS_LABEL[status] || status?.replace(/_/g, " ") || "Unknown";
  const style =
    status === "filled"
      ? "bg-gain/15 text-gain"
      : OPEN.includes(status)
        ? "bg-bronze/15 text-bronze"
        : status === "rejected"
          ? "bg-loss/15 text-loss"
          : "bg-slate text-muted";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${style}`}>{label}</span>;
}

function describeAmount(order) {
  const crypto = order.asset_class === "crypto";
  const unit = crypto ? displaySymbol(toChartSymbol(order.symbol)) : null;
  if (order.notional && !order.qty) {
    const filled = parseFloat(order.filled_qty);
    return {
      main: formatCurrency(order.notional),
      sub: filled > 0 ? `${formatNumber(filled, { digits: 6 })} ${unit || "shares"}` : "Dollar amount",
    };
  }
  const qty = parseFloat(order.qty);
  const filled = parseFloat(order.filled_qty);
  const noun = unit || (qty === 1 ? "share" : "shares");
  return {
    main: `${formatNumber(qty, { digits: 8 })} ${noun}`,
    sub: filled > 0 && filled < qty ? `${formatNumber(filled, { digits: 8 })} filled` : null,
  };
}

// Recent brokerage orders with status filters and cancel for open orders
export default function Orders({ orders, isLoading, error, onRetry, onChanged }) {
  const [filter, setFilter] = useState("all");
  const [canceling, setCanceling] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  const rows = useMemo(() => {
    const list = [...(orders || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (filter === "open") return list.filter((o) => OPEN.includes(o.status));
    if (filter === "filled") return list.filter((o) => o.status === "filled");
    if (filter === "canceled") return list.filter((o) => CLOSED_BAD.includes(o.status));
    return list;
  }, [orders, filter]);

  async function cancel(order) {
    setCanceling(order.id);
    setCancelError(null);
    try {
      const r = await fetch("/api/cancel-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: order.id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data.status !== "success") throw new Error(data.message);
      onChanged?.();
    } catch (e) {
      setCancelError(`Couldn't cancel the ${order.symbol} order${e.message ? `: ${e.message}` : ""}. Try again.`);
    }
    setCanceling(null);
  }

  let body;
  if (isLoading) body = <div className="p-5"><SkeletonRows rows={4} /></div>;
  else if (error) body = <ErrorState message="Your orders couldn't be loaded." onRetry={onRetry} />;
  else if (!orders?.length)
    body = (
      <EmptyState
        title="No orders yet"
        description="Orders you place appear here, with their status and fill price."
        action={<Link href="/markets" className="btn btn-ghost btn-sm border border-line">Find something to buy</Link>}
      />
    );
  else if (!rows.length) body = <EmptyState title={`No ${FILTERS.find((f) => f.key === filter).label.toLowerCase()} orders`} />;
  else
    body = (
      <ul className="max-h-[480px] divide-y divide-line overflow-y-auto">
        {rows.map((order) => {
          const symbol = toChartSymbol(order.symbol);
          const amount = describeAmount(order);
          const type = order.order_type || order.type;
          const price = order.filled_avg_price || order.limit_price;
          const isOpen = OPEN.includes(order.status);
          return (
            <li key={order.id} className="flex items-center gap-3 px-5 py-3">
              <Link href={assetHref(symbol)} className="flex min-w-0 flex-1 items-center gap-3">
                <AssetLogo symbol={symbol} size={32} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-marble">
                    {order.side === "sell" ? "Sell" : "Buy"} {displaySymbol(symbol)}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {type === "limit" ? "Limit" : type === "market" ? "Market" : type} order ·{" "}
                    <time dateTime={order.created_at} title={formatDate(order.created_at)}>{timeAgo(order.created_at)}</time>
                  </span>
                </span>
              </Link>
              <div className="hidden w-32 shrink-0 text-right sm:block">
                <div className="tabular text-sm text-marble">{amount.main}</div>
                {amount.sub ? <div className="tabular text-xs text-muted">{amount.sub}</div> : null}
              </div>
              <div className="w-28 shrink-0 text-right">
                <div className="tabular text-sm text-marble">{price ? formatCurrency(price) : "Market price"}</div>
                <div className="text-xs text-muted">{order.filled_avg_price ? "Avg. fill" : type === "limit" ? "Limit" : "Pending"}</div>
              </div>
              <div className="flex w-28 shrink-0 flex-col items-end gap-1">
                <StatusBadge status={order.status} />
                {isOpen ? (
                  <button
                    type="button"
                    onClick={() => cancel(order)}
                    disabled={canceling === order.id}
                    className="text-xs text-muted underline-offset-2 hover:text-loss hover:underline disabled:opacity-50"
                  >
                    {canceling === order.id ? "Canceling" : "Cancel order"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    );

  return (
    <Panel
      title="Orders"
      actions={
        orders?.length ? (
          <div role="tablist" aria-label="Filter orders" className="inline-flex rounded-btn border border-line bg-basalt p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-[0.4rem] px-2.5 py-1 text-xs font-medium transition-colors ${filter === f.key ? "bg-slate text-marble" : "text-muted hover:text-marble"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null
      }
      bodyClassName=""
    >
      {cancelError ? <p className="border-b border-line bg-loss/10 px-5 py-2.5 text-sm text-marble" role="alert">{cancelError}</p> : null}
      {body}
    </Panel>
  );
}
