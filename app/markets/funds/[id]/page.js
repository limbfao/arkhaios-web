import Link from "next/link";
import { ChevronLeftIcon } from "@heroicons/react/20/solid";
import FundChart from "../fundChart";
import FundStats from "../fundStats";
import JoinFund from "../joinFund";
import { EmptyState, Panel } from "../../../components/ui";
import { currentUser, loadFundBySymbol } from "../../../funds-home/fundServer";
import { AnnouncementList, StageBadge, SymbolTag, TermPanelBody } from "../../../funds-home/fundKit";
import { termInfo } from "../../../funds-home/fundTerms";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  return { title: `${decodeURIComponent(params.id).toUpperCase()} fund · Arkhaios` };
}

export default async function Page({ params }) {
  const symbol = decodeURIComponent(params.id).toUpperCase();
  const [user, { fund: raw, announcements, managers }] = await Promise.all([
    currentUser(),
    loadFundBySymbol(symbol),
  ]);

  if (!raw) {
    return (
      <div className="page">
        <div className="panel">
          <EmptyState
            title={`No fund with the symbol ${symbol}`}
            description="Check the symbol, or search for funds from the bar at the top."
            action={<Link href="/markets/funds" className="btn btn-primary btn-sm">Browse funds</Link>}
          />
        </div>
      </div>
    );
  }

  const me = user?.accountID;
  const isManager = raw.portfolioManagers?.includes(me);
  const isMember = raw.members?.includes(me);
  const status = isManager ? "manager"
    : isMember ? "member"
    : (raw.memberRequests || []).some((r) => r.user === me) ? "requested"
    : "none";

  const contributions = raw.contributions || [];
  const valid = contributions.filter((c) => !["canceled", "rejected", "deleted", "failed"].includes(c.status));
  const mine = valid.filter((c) => c.user === me).sort((a, b) => b.time - a.time);
  const totalContributed = valid.reduce((n, c) => n + (parseFloat(c.amount) || 0), 0);

  // Only what the public page needs: no access code, requests or other members' deposits
  const fund = {
    fundID: raw.fundID,
    fundName: raw.fundName,
    fundSymbol: raw.fundSymbol,
    fundDescription: raw.fundDescription,
    publiclyAvailable: Boolean(raw.publiclyAvailable),
    fundRecruiting: Boolean(raw.fundRecruiting),
    recruitEnd: raw.recruitEnd || null,
    dateCreated: raw.dateCreated || null,
    fundDisbursementPeriod: raw.fundDisbursementPeriod,
    disbursementType: raw.disbursementType,
  };
  const memberCount = raw.members?.length || 0;
  const stage = termInfo(fund).stage;
  const canSeeDetails = fund.publiclyAvailable || isMember || isManager;

  return (
    <div className="page">
      <Link href="/markets/funds" className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-marble">
        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        Funds
      </Link>

      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <SymbolTag symbol={fund.fundSymbol} />
          <StageBadge stage={stage} />
          {!fund.publiclyAvailable ? <span className="text-xs text-muted">Private fund</span> : null}
        </div>
        <h1 className="page-title">{fund.fundName}</h1>
        <p className="mt-1.5 text-sm text-muted">
          Managed by {managers.map((m) => m.name).join(", ") || "an Arkhaios member"} · {memberCount} {memberCount === 1 ? "member" : "members"}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {canSeeDetails ? <FundChart symbol={fund.fundSymbol} height={300} /> : null}
          <FundStats fund={fund} memberCount={memberCount} managers={managers} />
          {canSeeDetails ? (
            <Panel title="Announcements">
              <AnnouncementList announcements={announcements} />
            </Panel>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <JoinFund fund={fund} status={status} contributions={mine} totalContributed={totalContributed} />
          <Panel title={stage === "recruiting" ? "Recruiting window" : "Current term"}>
            <TermPanelBody fund={fund} details={false} />
          </Panel>
        </aside>
      </div>
    </div>
  );
}
