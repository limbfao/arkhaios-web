import Link from "next/link";
import { cookies } from "next/headers";
import StatusScreen from "./public-ui/StatusScreen";

export const metadata = { title: "Page not found · Arkhaios" };

export default function NotFound() {
  // Signed-in visitors see this inside the app shell; send them back to their dashboard
  const inApp = !!cookies().get("session")?.value;
  return (
    <StatusScreen
      inApp={inApp}
      code="404"
      title="We couldn't find that page"
      actions={
        inApp ? (
          <>
            <Link href="/home" className="btn btn-primary">Go to home</Link>
            <Link href="/markets" className="btn btn-ghost border border-line">Browse markets</Link>
          </>
        ) : (
          <>
            <Link href="/" className="btn btn-primary">Go to the homepage</Link>
            <Link href="/login" className="btn btn-ghost border border-line">Sign in</Link>
          </>
        )
      }
    >
      The link may be broken, or the page may have moved. Check the address, or head back and try again.
    </StatusScreen>
  );
}
