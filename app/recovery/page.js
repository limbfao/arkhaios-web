import PasswordReset from "./PasswordReset";

export const metadata = { title: "Reset your password · Arkhaios" };

export default function Page() {
  return <PasswordReset demoMode={process.env.DEMO_MODE === "1"} />;
}
