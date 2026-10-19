"use client";

// The fund's order history with open/filled/all filters and cancel for open orders

import Link from "next/link";
import { useMemo, useState } from "react";
import useFetch from "../hooks/useFetch";
import { AssetLogo, EmptyState, ErrorState, SkeletonRows } from "../components/ui";
import { formatCurrency, formatDate, formatNumber } from "../lib/format";
import { postJSON, useToast } from "../funds-home/fundKit";

const OPEN = ["new", "accepted", "pending_new", "partially_filled", "held"];
const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "filled", label: "Filled" },
];

function statusLabel(status) {
  if (OPEN.includes(status)) return status === "partially_filled" ? "Partially filled" : "Open";
  const s = String(status || "").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusTone(status) {
  if (status === "filled") return "text-gain";
  if (OPEN.includes(status)) return "text-bronze";
  return "text-muted";
}

export default function FundOrders({ fundID, onChange }) {
  const [filter, setFilter] = useState("all");
  const { responseJSON, isLoading, error, reload } = useFetch(`/api/orders?fund=${encodeURIComponent(fundID)}`);
  const [toast, notify] = useToast();
  const [canceling, setCanceling] = useState(null);

  async function cancel(order) {
    setCanceling(order.id);
    const result = await postJSON("/api/fund/cancel-order", { fundID, order: order.id });
    setCanceling(null);
    if (result.ok) {
      notify(`Canceled the ${order.side} order for ${order.symbol}. Reserved cash was returned.`);
      reload();
      onChange?.();
    } else {
      notify(result.message || "The order couldn't be canceled.", "error");
    }
  }
  const orders = useMemo(() => {
    const list = responseJSON?.data || [];
    if (filter === "open") return list.filter((o) => OPEN.includes(o.status));
    if (filter === "filled") return list.filter((o) => o.status === "filled");
    return list;
  }, [responseJSON, filter]);

  return (
    <section className="panel" aria-label="Fund orders">
      <div className="panel-header">
        <h2 className="panel-title">Orders</h2>
        <div role="tablist" aria-label="Filter orders" className="inline-flex rounded-btn border border-line bg-basalt p-0.5">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-[0.4rem] px-2.5 py-1 text-xs font-medium ${filter === f.key ? "bg-slate text-bronze" : "text-muted hover:text-marble"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="p-5"><SkeletonRows rows={4} /></div>
      ) : error ? (
        <ErrorState message="Orders couldn't be loaded." onRetry={reload} />
      ) : orders.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No orders yet" : `No ${filter} orders`}
          description="Orders you place on behalf of the fund appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th scope="col" className="px-5 py-2.5 font-medium">Symbol</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Side</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Shares</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Limit price</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Fill price</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Total</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Placed</th>
                <th scope="col" className="px-5 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const qty = parseFloat(o.qty) || 0;
                const filledQty = parseFloat(o.filled_qty) || 0;
                const fill = parseFloat(o.filled_avg_price);
                const limit = parseFloat(o.limit_price);
                const total = o.status === "filled" ? filledQty * fill : qty * (limit || 0);
                return (
                  <tr key={o.id} className="border-b border-line/60 last:border-b-0 hover:bg-slate/40">
                    <td className="px-5 py-3">
                      <Link href={`/fundMarkets/stocks/${encodeURIComponent(o.symbol)}`} className="flex items-center gap-3 hover:text-bronze">
                        <AssetLogo symbol={o.symbol} size={26} />
                        <span className="font-medium text-marble">{o.symbol}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 capitalize text-marble">{o.side} <span className="text-muted">{o.order_type || o.type}</span></td>
                    <td className="px-3 py-3 text-right text-marble">
                      {formatNumber(qty)}
                      {OPEN.includes(o.status) && filledQty ? <span className="text-xs text-muted"> ({formatNumber(filledQty)} filled)</span> : null}
                    </td>
                    <td className="px-3 py-3 text-right text-muted">{formatCurrency(limit)}</td>
                    <td className="px-3 py-3 text-right text-marble">{formatCurrency(fill)}</td>
                    <td className="px-3 py-3 text-right text-marble">{formatCurrency(total)}</td>
                    <td className={`px-3 py-3 ${statusTone(o.status)}`}>{statusLabel(o.status)}</td>
                    <td className="px-3 py-3 text-right text-muted">{formatDate(o.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      {OPEN.includes(o.status) ? (
                        <button type="button" className="btn btn-ghost btn-xs border border-line" disabled={canceling === o.id}
                          onClick={() => cancel(o)}>
                          {canceling === o.id ? <span className="loading loading-spinner loading-xs" /> : null}
                          Cancel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {toast}
    </section>
  );
}
