import CreateFundPage from "./CreateFundPage";
import ManageFund from "./ManageFund";
import { currentUser, loadManagedFund } from "./fundServer";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await currentUser();
  const { fund, announcements } = await loadManagedFund(user);

  if (!fund) return <CreateFundPage />;

  return <ManageFund fund={fund} announcements={announcements} />;
}
