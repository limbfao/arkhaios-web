"use client";

import { Panel } from "../../components/ui";
import { changeColor, formatCurrency, formatNumber, formatPercent, formatSignedCurrency } from "../../lib/format";

function Item({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-sm font-medium text-marble">{children}</dd>
    </div>
  );
}

// Summary of the user's holding in one asset (Alpaca position shape)
export default function PositionPanel({ position, isCrypto, ticker }) {
  if (!position) return null;
  const qty = parseFloat(position.qty);
  return (
    <Panel title="Your position">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Item label={isCrypto ? `Quantity (${ticker})` : "Shares"}>{formatNumber(qty, { digits: 8 })}</Item>
        <Item label="Market value">{formatCurrency(position.market_value)}</Item>
        <Item label="Average cost">{formatCurrency(position.avg_entry_price)}</Item>
        <Item label="Cost basis">{formatCurrency(position.cost_basis)}</Item>
        <Item label="Today's return">
          <span className={changeColor(position.unrealized_intraday_pl)}>
            {formatSignedCurrency(position.unrealized_intraday_pl)} ({formatPercent(position.unrealized_intraday_plpc)})
          </span>
        </Item>
        <Item label="Total return">
          <span className={changeColor(position.unrealized_pl)}>
            {formatSignedCurrency(position.unrealized_pl)} ({formatPercent(position.unrealized_plpc)})
          </span>
        </Item>
      </dl>
    </Panel>
  );
}
