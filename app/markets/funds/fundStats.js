"use client";

// "About" panel of the public fund page: strategy, stage, term and fee structure

import { Panel } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { StageBadge, feeInfo, periodInfo, termInfo } from "../../funds-home/fundKit";

export default function FundStats({ fund, memberCount, managers }) {
  const term = termInfo(fund);
  const fee = feeInfo(fund.disbursementType);
  const period = periodInfo(fund.fundDisbursementPeriod);

  return (
    <Panel title="About this fund">
      <p className="whitespace-pre-line text-sm leading-relaxed text-marble">
        {fund.fundDescription || "The portfolio manager hasn't added a description yet."}
      </p>

      <dl className="mt-6 grid gap-x-6 gap-y-5 border-t border-line pt-5 text-sm sm:grid-cols-3">
        <Fact label="Stage"><StageBadge stage={term.stage} /></Fact>
        <Fact label={term.stage === "recruiting" ? "Recruiting ends" : "Next distribution"}>
          {term.end ? formatDate(term.end, { time: false }) : "Not scheduled"}
        </Fact>
        <Fact label="Term length">{period.label}</Fact>
        <Fact label="Portfolio manager">{managers?.map((m) => m.name).join(", ") || "—"}</Fact>
        <Fact label="Members">{memberCount}</Fact>
        <Fact label="Founded">{fund.dateCreated ? formatDate(fund.dateCreated, { time: false }) : "—"}</Fact>
      </dl>

      <div className="mt-6 rounded-box border border-line bg-basalt/60 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium text-marble">Fees: {fund.disbursementType}</h3>
          <span className="text-xs text-muted">Charged at the end of each term</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="stat-value text-2xl font-semibold text-marble">{fee.base}%</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">Base fee on the fund&apos;s value, every term.</p>
          </div>
          <div>
            <div className="stat-value text-2xl font-semibold text-marble">{fee.performance}%</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              of profits, only when the term&apos;s return beats {fee.hurdle != null ? `${fee.hurdle}%` : "the hurdle"}.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 text-marble">{children}</dd>
    </div>
  );
}
