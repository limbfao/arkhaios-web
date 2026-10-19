import Link from "next/link";
import { PageHeader, Panel } from "../../components/ui";
import FundList from "./FundList";

export const metadata = { title: "Funds · Arkhaios" };

export default function Page() {
  return (
    <div className="page">
      <PageHeader
        title="Funds"
        subtitle="Pool money with people you trust. Each fund is run by a portfolio manager who trades on the members' behalf."
        actions={<Link href="/dashboard" className="btn btn-outline btn-sm border-line text-marble hover:border-bronze hover:bg-transparent hover:text-bronze">Start a fund</Link>}
      />
      <Panel bodyClassName="">
        <FundList />
      </Panel>
    </div>
  );
}
