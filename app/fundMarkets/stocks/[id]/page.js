import Link from "next/link";
import FundTrade from "../FundTrade";
import { EmptyState } from "../../../components/ui";
import { currentUser, loadManagedFund } from "../../../funds-home/fundServer";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  return { title: `Trade ${decodeURIComponent(params.id).toUpperCase()} for your fund · Arkhaios` };
}

export default async function Page({ params }) {
  const symbol = decodeURIComponent(params.id).toUpperCase();
  const user = await currentUser();
  const { fund } = await loadManagedFund(user);

  if (!fund) {
    return (
      <div className="page">
        <div className="panel">
          <EmptyState
            title="Only portfolio managers can trade for a fund"
            description="Start a fund to trade on behalf of its members, or trade this stock in your own account."
            action={
              <div className="flex gap-2">
                <Link href="/dashboard" className="btn btn-primary btn-sm">Start a fund</Link>
                <Link href={`/markets/stocks/${encodeURIComponent(symbol)}`} className="btn btn-ghost btn-sm border border-line">
                  Trade {symbol} personally
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return <FundTrade fund={fund} symbol={symbol} />;
}
