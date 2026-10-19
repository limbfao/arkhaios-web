import { redirect } from "next/navigation";

// The Express server renders "/" for the main domain and "/funds-home" for the funds.
// subdomain. /root-home was a placeholder for the main-domain home; send it to the landing page.
export default function Page() {
  redirect("/");
}
