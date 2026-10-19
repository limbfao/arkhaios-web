"use client";

import Link from "next/link";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import useFetch from "../hooks/useFetch";
import { Panel, SkeletonRows } from "../components/ui";
import AssetRows from "../markets/components/AssetRows";

const STEPS = [
  "Confirm your legal name, date of birth and address",
  "Answer a few questions about your investing experience",
  "Link a bank account and make your first deposit",
];

// Home view for members who haven't finished identity verification (KYC)
export default function VerifyPrompt() {
  const { responseJSON, isLoading } = useFetch("/api/market/snapshot?symbols=SPY,QQQ,AAPL,NVDA,BTC-USD,ETH-USD");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="panel p-8" aria-labelledby="verify-title">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-bronze/15 text-bronze">
          <ShieldCheckIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 id="verify-title" className="mt-5 font-display text-3xl text-marble">Finish setting up your account</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          We're required to verify your identity before you can trade, deposit money or invest in a fund.
          It usually takes about five minutes. Until then you can browse markets, build a watchlist and read the news.
        </p>
        <ol className="mt-6 space-y-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-sm text-marble">
              <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-xs text-muted">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/account/settings/personal-information" className="btn btn-primary">Verify identity</Link>
          <Link href="/markets" className="btn btn-ghost border border-line">Explore markets</Link>
        </div>
      </section>

      <Panel title="Markets today" bodyClassName="">
        {isLoading ? <div className="p-5"><SkeletonRows rows={4} /></div> : <AssetRows items={responseJSON?.data || []} />}
      </Panel>
    </div>
  );
}
