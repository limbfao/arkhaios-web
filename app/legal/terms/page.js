import LegalPage from "../../public-ui/LegalPage";

export const metadata = { title: "Terms of use · Arkhaios" };

export default function Page() {
  return (
    <LegalPage
      title="Terms of use"
      updated="October 2026"
      intro="These terms cover your use of the Arkhaios website and app. By creating an account you agree to them. This page is a plain-language summary; the full customer agreement is provided when you open a brokerage account."
      sections={[
        {
          title: "Your account",
          body: [
            "You must be at least 18, give accurate information, and verify your identity before you can deposit money, trade or join a fund. You're responsible for keeping your password and any two-step verification codes private.",
            "One person may hold one Arkhaios account. We may suspend or close accounts that break these terms or the law.",
          ],
        },
        {
          title: "Trading",
          body: [
            "Orders are sent to market on your instruction and are not guaranteed to fill, or to fill at the price you see. Prices shown in the app may be delayed.",
            "You're responsible for the investment decisions you make. Arkhaios does not give investment, tax or legal advice.",
          ],
        },
        {
          title: "Funds",
          body: [
            "A fund's portfolio manager (PM) makes its investment decisions, not Arkhaios. Before you join, read the fund's description and terms, including its fee structure and payout schedule. Those terms apply once you deposit.",
            "PMs must manage a fund in line with its stated terms and must not mislead members.",
          ],
        },
        {
          title: "Messages and community",
          body: [
            "Don't use chat, announcements or profiles to harass anyone, share other people's personal information, or promote schemes to manipulate prices. We may remove content and restrict accounts that do.",
          ],
        },
        {
          title: "Changes",
          body: [
            "We'll tell you about material changes to these terms in the app or by email before they take effect.",
          ],
        },
      ]}
    />
  );
}
