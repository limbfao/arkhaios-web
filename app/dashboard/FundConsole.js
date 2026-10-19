"use client";

// Portfolio manager console: fund KPIs, value chart, term, holdings, members,
// join requests and announcements.

import Link from "next/link";
import useFetch from "../hooks/useFetch";
import { EmptyState, ErrorState, Panel, Skeleton, SkeletonRows } from "../components/ui";
import { changeColor, formatCurrency, formatDate, formatPercent, formatSignedCurrency } from "../lib/format";
import {
  AnnouncementComposer, AnnouncementList, FundValueChart, Initials, JoinRequests, StageBadge, SymbolTag,
  TermPanelBody, termInfo, useAnnouncements, useToast,
} from "../funds-home/fundKit";
import FundHoldings, { summarize } from "../fundFinances/FundHoldings";

export default function FundConsole({ fund, announcements: initialAnnouncements, managerName }) {
  const [toast, notify] = useToast();
  const positions = useFetch(`/api/positions?fund=${encodeURIComponent(fund.fundID)}`);
  const members = useFetch(`/api/fund/members?id=${encodeURIComponent(fund.fundID)}`);
  const [announcements, refreshAnnouncements] = useAnnouncements(fund.fundID, initialAnnouncements);

  const summary = summarize(positions.responseJSON?.data, fund.availableBalance);
  const stage = termInfo(fund).stage;
  const memberData = members.responseJSON?.data;
  const contributed = memberData?.totalInvested ?? null;
  const totalReturn = contributed ? summary.total - contributed : null;
  const requestCount = memberData?.requests?.length || 0;

  return (
    <div className="page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SymbolTag symbol={fund.fundSymbol} />
            <StageBadge stage={stage} />
          </div>
          <h1 className="page-title truncate">{fund.fundName}</h1>
          <p className="mt-1.5 text-sm text-muted">
            Managed by {managerName} · Founded {formatDate(fund.dateCreated, { time: false })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/markets/funds/${fund.fundSymbol}`} className="btn btn-ghost btn-sm border border-line">
            View public page
          </Link>
          <Link href="/funds-home" className="btn btn-ghost btn-sm border border-line">Fund settings</Link>
          <Link href="/fundFinances" className="btn btn-primary btn-sm">Positions and orders</Link>
        </div>
      </div>

      {/* KPI strip */}
      <section className="panel mb-6 grid grid-cols-2 divide-line lg:grid-cols-5 lg:divide-x" aria-label="Fund summary">
        <Kpi label="Assets under management" loading={positions.isLoading}
          value={formatCurrency(summary.total)}
          hint={<span className={changeColor(summary.dayChange)}>{formatSignedCurrency(summary.dayChange)} today</span>} />
        <Kpi label="Total return" loading={positions.isLoading || members.isLoading}
          value={<span className={changeColor(totalReturn)}>{formatSignedCurrency(totalReturn)}</span>}
          hint={contributed
            ? <span className="text-muted"><span className={changeColor(totalReturn)}>{formatPercent(totalReturn / contributed)}</span> on {formatCurrency(contributed)} contributed</span>
            : <span className="text-muted">No contributions yet</span>} />
        <Kpi label="Available cash" loading={positions.isLoading}
          value={formatCurrency(summary.cash)}
          hint={<span className="text-muted">{formatPercent(summary.total ? summary.cash / summary.total : 0, { signed: false, digits: 1 })} of AUM</span>} />
        <Kpi label="Invested" loading={positions.isLoading}
          value={formatCurrency(summary.invested)}
          hint={<span className="text-muted">{summary.list.length} {summary.list.length === 1 ? "position" : "positions"}</span>} />
        <Kpi label="Members" loading={false}
          value={fund.members?.length || 0}
          hint={requestCount
            ? <a href="#join-requests" className="text-bronze hover:underline">{requestCount} pending {requestCount === 1 ? "request" : "requests"}</a>
            : <span className="text-muted">No pending requests</span>} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FundValueChart symbol={fund.fundSymbol} title="Fund value" height={280} />
        </div>
        <Panel title={stage === "recruiting" ? "Recruiting window" : "Current term"}>
          <TermPanelBody fund={fund} />
        </Panel>

        <Panel
          className="lg:col-span-2"
          title="Holdings"
          bodyClassName=""
          actions={<Link href="/fundFinances" className="text-sm text-muted hover:text-bronze">View all activity</Link>}
        >
          <FundHoldings
            positions={positions.responseJSON?.data}
            cash={fund.availableBalance}
            isLoading={positions.isLoading}
            error={positions.error}
            onRetry={positions.reload}
          />
        </Panel>

        <Panel title="Members" bodyClassName="p-0"
          actions={contributed ? <span className="text-sm text-muted">{formatCurrency(contributed)} contributed</span> : null}>
          <MemberList data={memberData} isLoading={members.isLoading} error={members.error}
            onRetry={members.reload} aum={summary.total} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div id="join-requests" className="scroll-mt-24">
          <Panel title="Requests to join"
            actions={requestCount ? <span className="badge badge-sm border-bronze/40 bg-bronze/10 text-bronze">{requestCount}</span> : null}>
            <JoinRequests
              fundID={fund.fundID}
              requests={memberData?.requests}
              isLoading={members.isLoading}
              error={members.error}
              onRetry={members.reload}
              onChange={members.reload}
              notify={notify}
            />
          </Panel>
        </div>
        <Panel title="Announcements">
          <AnnouncementComposer fundID={fund.fundID} notify={notify} onPosted={refreshAnnouncements} />
          <div className="mt-6 border-t border-line pt-5">
            <AnnouncementList announcements={announcements} />
          </div>
        </Panel>
      </div>
      {toast}
    </div>
  );
}

function Kpi({ label, value, hint, loading }) {
  return (
    <div className="min-w-0 border-b border-line p-5 last:border-b-0 lg:border-b-0">
      <div className="text-sm text-muted">{label}</div>
      {loading ? (
        <div className="mt-2 space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : (
        <>
          <div className="stat-value mt-1 text-2xl font-semibold text-marble">{value}</div>
          {hint ? <div className="mt-1 text-sm tabular">{hint}</div> : null}
        </>
      )}
    </div>
  );
}

function MemberList({ data, isLoading, error, onRetry, aum }) {
  if (isLoading) return <div className="p-5"><SkeletonRows rows={3} /></div>;
  if (error) return <ErrorState message="Members couldn't be loaded." onRetry={onRetry} />;
  const members = (data?.members || []).slice().sort((a, b) => b.invested - a.invested);
  if (!members.length) {
    return <EmptyState title="No members yet" description="Accepted join requests appear here." />;
  }
  const total = data.totalInvested || 0;

  return (
    <ul className="divide-y divide-line">
      {members.map((m) => {
        const share = total ? m.invested / total : 0;
        return (
          <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
            <Initials name={m.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-marble">{m.name}</span>
                {m.manager ? <span className="text-xs text-bronze">Manager</span> : null}
              </div>
              <div className="text-xs text-muted">
                {formatPercent(share, { signed: false, digits: 1 })} of capital
                {aum && total ? <> · {formatCurrency(share * aum)} today</> : null}
              </div>
            </div>
            <div className="text-right">
              <div className="tabular text-sm text-marble">{formatCurrency(m.invested)}</div>
              <div className="text-xs text-muted">invested</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
