"use client";

import Link from "next/link";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ArrowsRightLeftIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import UserContext from "../../UserContext";
import { Badge, Card, DetailList, DetailRow, VerifyNotice, fetchJSON, sentenceCase } from "../accountUi";
import { Change, ErrorState, Skeleton } from "../../components/ui";
import { formatCurrency, formatDate, formatSignedCurrency, changeColor } from "../../lib/format";

const STATUS_TONES = { ACTIVE: "gain", APPROVED: "gain", SUBMITTED: "bronze", ACTION_REQUIRED: "loss", REJECTED: "loss", DISABLED: "loss" };

function useAccount(enabled) {
  const [state, setState] = useState({ loading: true, error: false, trading: null, status: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const [trading, status] = await Promise.all([
        fetchJSON("/api/account/trading"),
        fetchJSON("/api/account/status"),
      ]);
      setState({ loading: false, error: false, trading: trading.data, status: status.data });
    } catch (e) {
      setState({ loading: false, error: true, trading: null, status: null });
    }
  }, []);

  useEffect(() => { if (enabled) load(); }, [enabled, load]);
  return { ...state, reload: load };
}

function BalanceStat({ label, value, children, loading }) {
  return (
    <div className="min-w-0 p-5">
      <div className="text-sm text-muted">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-36" />
      ) : (
        <div className="stat-value mt-1 truncate text-2xl font-semibold text-marble">{value}</div>
      )}
      {children ? <div className="mt-1 text-sm">{loading ? <Skeleton className="h-4 w-24" /> : children}</div> : null}
    </div>
  );
}

const QUICK_LINKS = [
  { href: "/account/transfers", icon: ArrowsRightLeftIcon, title: "Deposit or withdraw", text: "Move money between your bank and Arkhaios" },
  { href: "/account/reports-statements", icon: DocumentTextIcon, title: "Statements and documents", text: "Monthly statements and trade confirmations" },
  { href: "/account/settings/security-privacy", icon: ShieldCheckIcon, title: "Security", text: "Two-factor authentication and sign-in" },
];

export default function Page() {
  const { user } = useContext(UserContext);
  const { loading, error, trading, status, reload } = useAccount(Boolean(user.kycVerified));

  const dayChange = trading ? parseFloat(trading.equity) - parseFloat(trading.last_equity) : null;
  const dayChangePct = trading && parseFloat(trading.last_equity) ? dayChange / parseFloat(trading.last_equity) : null;
  const contact = status?.contact;
  const address = contact
    ? [contact.street_address?.join(" "), contact.unit, contact.city, [contact.state, contact.postal_code].filter(Boolean).join(" ")]
        .filter(Boolean).join(", ")
    : null;

  return (
    <div className="space-y-6">
      {!user.kycVerified ? <VerifyNotice feature="your brokerage account" /> : null}

      {user.kycVerified ? (
        error ? (
          <div className="panel"><ErrorState message="Your balances couldn't be loaded." onRetry={reload} /></div>
        ) : (
          <div className="panel grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            <BalanceStat label="Portfolio value" loading={loading} value={formatCurrency(trading?.portfolio_value)}>
              <span className={`tabular ${changeColor(dayChange)}`}>{formatSignedCurrency(dayChange)}</span>{" "}
              <Change value={dayChangePct} /> <span className="text-muted">today</span>
            </BalanceStat>
            <BalanceStat label="Cash" loading={loading} value={formatCurrency(trading?.cash)}>
              <span className="text-muted">Available to withdraw</span>
            </BalanceStat>
            <BalanceStat label="Buying power" loading={loading} value={formatCurrency(trading?.buying_power)}>
              <span className="text-muted">
                {parseFloat(trading?.buying_power) > parseFloat(trading?.cash) ? "Includes margin" : "Ready to invest"}
              </span>
            </BalanceStat>
            <BalanceStat label="Invested" loading={loading} value={formatCurrency(trading?.long_market_value)}>
              <Link href="/home" className="text-bronze hover:text-bronze-light">View holdings</Link>
            </BalanceStat>
          </div>
        )
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Brokerage account" description="Held at Alpaca Securities LLC, member FINRA/SIPC">
          {!user.kycVerified ? (
            <p className="text-sm text-muted">Your brokerage account opens once your identity is verified.</p>
          ) : loading ? (
            <div className="space-y-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
          ) : (
            <DetailList>
              <DetailRow label="Account number"><span className="tabular">{trading?.account_number || "—"}</span></DetailRow>
              <DetailRow label="Status">
                <Badge tone={STATUS_TONES[trading?.status] || "muted"}>{sentenceCase(trading?.status || "Unknown")}</Badge>
              </DetailRow>
              <DetailRow label="Account type">
                {parseFloat(trading?.buying_power) > parseFloat(trading?.cash) ? "Individual margin" : "Individual cash"}
              </DetailRow>
              <DetailRow label="Crypto trading">
                {trading?.crypto_status ? sentenceCase(trading.crypto_status) : "Not enabled"}
              </DetailRow>
              <DetailRow label="Pattern day trader">{trading?.pattern_day_trader ? "Yes" : "No"}</DetailRow>
              <DetailRow label="Opened">{formatDate(trading?.created_at || status?.created_at, { time: false })}</DetailRow>
            </DetailList>
          )}
        </Card>

        <Card
          title="Personal details"
          actions={<Link href="/account/settings/personal-information" className="btn btn-ghost btn-xs text-muted">Manage</Link>}
        >
          <DetailList>
            <DetailRow label="Name">{user.firstName} {user.lastName}</DetailRow>
            <DetailRow label="Username">@{user.username}</DetailRow>
            <DetailRow label="Email">{user.email}</DetailRow>
            {user.kycVerified ? (
              <>
                <DetailRow label="Phone">{loading ? <Skeleton className="h-4 w-28" /> : contact?.phone_number || "—"}</DetailRow>
                <DetailRow label="Address">{loading ? <Skeleton className="h-4 w-48" /> : address || "—"}</DetailRow>
              </>
            ) : null}
            <DetailRow label="Member since">{formatDate(user.creationTime, { time: false })}</DetailRow>
          </DetailList>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {QUICK_LINKS.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="panel group flex items-start gap-4 p-5 transition-colors hover:border-bronze/40 hover:bg-slate/60">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-slate text-bronze group-hover:bg-basalt">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-marble">{title}</span>
              <span className="mt-0.5 block text-sm text-muted">{text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
