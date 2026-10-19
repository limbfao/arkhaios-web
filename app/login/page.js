import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Arkhaios" };

export default function Page() {
  // Only the demo server (demo/start.sh) sets DEMO_MODE; never shown in production
  return <LoginForm demoMode={process.env.DEMO_MODE === "1"} />;
}
