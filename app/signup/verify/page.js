import { cookies } from "next/headers";
import VerifyForm from "./VerifyForm";

export const metadata = { title: "Verify your email · Arkhaios" };

export default function Page() {
  // The layout only lets signed-in, unverified accounts reach this page
  const email = cookies().get("email")?.value || "";
  return <VerifyForm email={email} demoMode={process.env.DEMO_MODE === "1"} />;
}
