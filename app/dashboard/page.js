import FundConsole from "./FundConsole";
import CreateFundPage from "../funds-home/CreateFundPage";
import { currentUser, loadManagedFund } from "../funds-home/fundServer";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await currentUser();
  const { fund, announcements } = await loadManagedFund(user);

  if (!fund) return <CreateFundPage />;

  return (
    <FundConsole
      fund={fund}
      announcements={announcements}
      managerName={user ? `${user.firstName} ${user.lastName}` : "you"}
    />
  );
}
