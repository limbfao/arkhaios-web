import FundFinances from "./FundFinances";
import CreateFundPage from "../funds-home/CreateFundPage";
import { currentUser, loadManagedFund } from "../funds-home/fundServer";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await currentUser();
  const { fund } = await loadManagedFund(user);

  // Only portfolio managers have fund finances; everyone else can start a fund
  if (!fund) return <CreateFundPage />;

  return <FundFinances fund={fund} />;
}
