import LegalPage from "../../public-ui/LegalPage";

export const metadata = { title: "Disclosures · Arkhaios" };

export default function Page() {
  return (
    <LegalPage
      title="Disclosures"
      updated="October 2026"
      intro="Investing involves risk. Please read these disclosures before you trade or join a fund."
      sections={[
        {
          title: "Investment risk",
          body: [
            "The value of investments can go down as well as up, and you may lose some or all of the money you invest. Past performance, including a fund's track record shown in the app, does not guarantee future results.",
          ],
        },
        {
          title: "Cryptocurrency",
          body: [
            "Cryptocurrencies are highly volatile, trade around the clock, and are not securities. Crypto holdings are not protected by SIPC or FDIC insurance.",
          ],
        },
        {
          title: "Funds",
          body: [
            "Funds on Arkhaios are run by their portfolio managers, who are Arkhaios customers, not employees or advisers of Arkhaios. Arkhaios does not review, recommend or endorse any fund or its strategy.",
            "A fund's fees reduce its returns. In a 2/20 fund, for example, the PM receives a 2% yearly management fee plus 20% of the fund's profits.",
          ],
        },
        {
          title: "No advice",
          body: [
            "Content in the app, including news, charts, company financials, posts from friends and fund announcements, is for information only. It is not a recommendation to buy or sell any investment.",
          ],
        },
        {
          title: "Market data",
          body: [
            "Quotes and charts may be delayed and are provided by third parties. We don't guarantee their accuracy or completeness.",
          ],
        },
      ]}
    />
  );
}
