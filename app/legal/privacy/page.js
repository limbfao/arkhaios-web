import LegalPage from "../../public-ui/LegalPage";

export const metadata = { title: "Privacy policy · Arkhaios" };

export default function Page() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="October 2026"
      intro="This policy explains what personal information Arkhaios collects, why, and the choices you have. We don't sell your personal information."
      sections={[
        {
          title: "What we collect",
          body: [
            "Account details you give us: your name, email address and password (stored only as a salted hash). To open a brokerage account we also collect the identity information that financial regulations require, such as your date of birth, address and tax ID.",
            "Activity in the app: your orders, positions, watchlist, fund memberships, friends and the messages you send.",
          ],
        },
        {
          title: "How we use it",
          body: [
            "To run your account and carry out your instructions, to verify your identity and prevent fraud, to meet our legal and regulatory obligations, and to send you service emails such as verification codes.",
          ],
        },
        {
          title: "Who can see it",
          body: [
            "Your friends see your profile and the messages you send them. Members of a fund see its holdings, performance and announcements, and the fund's PM sees who its members are and how much each has invested.",
            "We share information with the service providers that help us operate (for example our brokerage, bank-linking and email partners) only as needed to provide the service, and with regulators or law enforcement when the law requires it.",
          ],
        },
        {
          title: "Your choices",
          body: [
            "You can update your profile at any time in your account settings. You can ask us for a copy of your data or ask us to delete your account; some records must be kept for the period the law requires.",
          ],
        },
        {
          title: "Cookies",
          body: [
            "We use essential cookies to keep you signed in. We don't use advertising cookies.",
          ],
        },
      ]}
    />
  );
}
