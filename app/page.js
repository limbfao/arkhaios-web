import Link from "next/link";
import Carousel from "./components/logoCarousel/carousel";
import { SiteNav, SiteFooter } from "./public-ui/SiteChrome";

export const metadata = {
  title: "Arkhaios · Invest on your own, or together",
  description:
    "Trade stocks and crypto, and start or join an investment fund with people you know.",
};

const STEPS = [
  {
    title: "Start a fund",
    body:
      "Anyone with a verified account can start one fund and become its portfolio manager (PM). You choose a name and ticker symbol, write what the fund invests in, and set its terms: the fee structure, how often returns are paid out, and whether the fund is public or private.",
  },
  {
    title: "Recruit members",
    body:
      "While the fund is recruiting, people ask to join and the PM approves each request. To join a private fund you also need its six-digit access code from the PM. Approved members deposit money into the fund before recruiting closes.",
  },
  {
    title: "Trade",
    body:
      "When recruiting ends, the PM trades the pooled money as one portfolio, using limit orders. Every member can see the fund's holdings, its performance and the PM's announcements as they happen.",
  },
  {
    title: "Pay out",
    body:
      "The fund settles up on the schedule set at the start, such as monthly or quarterly: the PM's fees are calculated under the fund's fee structure and members' returns are paid out.",
  },
];

const FEES = [
  { name: "1/10", management: "1%", performance: "10%" },
  { name: "2/20", management: "2%", performance: "20%" },
  { name: "3/30", management: "3%", performance: "30%" },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-basalt text-marble">
      {/* Hero */}
      <section className="relative isolate flex min-h-[92vh] items-end overflow-hidden">
        <img
          src="/bullvsBearPillar.jpg"
          alt="Marble statues of a bull and a bear facing each other among classical columns"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_30%]"
        />
        {/* Scrims keep the nav and headline legible over the photograph */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-basalt via-basalt/60 to-transparent" />
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-basalt/80 to-transparent" />

        <SiteNav overlay />

        <div className="mx-auto w-full max-w-[1200px] px-6 pb-20 pt-40 lg:px-10 lg:pb-24">
          <h1 className="max-w-3xl font-display text-6xl leading-[1.02] text-marble drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] sm:text-7xl lg:text-8xl">
            Fund your future.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-marble/85">
            A brokerage for stocks and crypto, with investment funds you can start or join
            with people you know.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="btn btn-primary px-6">Create an account</Link>
            <a href="#how-funds-work" className="btn btn-ghost border border-marble/25 px-6 text-marble hover:border-marble/40 hover:bg-marble/10">
              See how funds work
            </a>
          </div>
        </div>
      </section>

      {/* Trading */}
      <section id="trading" className="scroll-mt-8 border-b border-line">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-24 lg:grid-cols-[5fr_7fr] lg:gap-20 lg:px-10">
          <div>
            <h2 className="font-display text-4xl leading-tight lg:text-5xl">One account for your own investing.</h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
              Arkhaios is a full brokerage account first. Use it on your own, put part of it into a fund,
              or both.
            </p>
          </div>
          <dl className="divide-y divide-line border-y border-line">
            <div className="grid gap-2 py-7 sm:grid-cols-[200px_1fr] sm:gap-8">
              <dt className="text-base font-semibold">Stocks and crypto</dt>
              <dd className="text-muted leading-relaxed">
                Buy and sell US-listed stocks and major cryptocurrencies with market or limit orders.
                Research a company with live quotes, charts, financials and news before you trade.
              </dd>
            </div>
            <div className="grid gap-2 py-7 sm:grid-cols-[200px_1fr] sm:gap-8">
              <dt className="text-base font-semibold">Your portfolio</dt>
              <dd className="text-muted leading-relaxed">
                See every position, its gain or loss and your order history in one place, and keep a
                watchlist of what you're following.
              </dd>
            </div>
            <div className="grid gap-2 py-7 sm:grid-cols-[200px_1fr] sm:gap-8">
              <dt className="text-base font-semibold">Friends and chat</dt>
              <dd className="text-muted leading-relaxed">
                Add friends, message them directly, and talk through a trade before you make it. Fund
                members also get announcements from their portfolio manager.
              </dd>
            </div>
          </dl>
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-[1200px] px-6 pt-8 text-sm text-muted lg:px-10">
            Thousands of US stocks and ETFs, including
          </p>
          <Carousel />
        </div>
      </section>

      {/* Funds */}
      <section id="funds" className="scroll-mt-8 border-b border-line bg-stone">
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-6 py-24 lg:grid-cols-2 lg:gap-20 lg:px-10">
          <div>
            <h2 className="font-display text-4xl leading-tight lg:text-5xl">Invest together, with clear terms.</h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
              A fund on Arkhaios is a pool of money that one person, the portfolio manager, invests on behalf
              of its members. It works like a small investment club, except the rules are written down before
              anyone puts money in, and every member can see what the fund holds.
            </p>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
              Start one if you have a strategy your friends keep asking about. Join one if you'd rather back
              someone you trust than pick every stock yourself.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary">Start or join a fund</Link>
            </div>
          </div>

          {/* Illustrative term sheet, not a real fund */}
          <figure className="rounded-box border border-line bg-basalt">
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <p className="font-display text-2xl">Harbor Value</p>
                <p className="mt-1 text-sm text-muted">HRBV · Managed by a friend of yours</p>
              </div>
              <span className="rounded-full border border-bronze/40 bg-bronze/10 px-2.5 py-1 text-xs font-medium text-bronze-light">
                Recruiting
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-line">
              {[
                ["Fee structure", "2/20"],
                ["Payouts", "Quarterly"],
                ["Visibility", "Private, access code"],
                ["Orders", "Limit orders only"],
              ].map(([k, v]) => (
                <div key={k} className="bg-basalt px-6 py-4">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="mt-1 text-sm font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <figcaption className="border-t border-line px-6 py-4 text-xs text-muted">
              An example of the terms every fund shows before you join.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* How funds work */}
      <section id="how-funds-work" className="scroll-mt-8 border-b border-line">
        <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10">
          <h2 className="max-w-2xl font-display text-4xl leading-tight lg:text-5xl">How a fund works, start to finish.</h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-t border-bronze/40 pt-6">
                <span className="font-display text-3xl text-bronze">{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-20 grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-20">
            <div>
              <h3 className="font-display text-3xl leading-tight">What a PM earns</h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                Each fund picks one of three fee structures. The first number is a yearly management fee
                on the money in the fund. The second is the share of the fund's profits the PM keeps.
                In a 2/20 fund, the PM takes 2% a year plus 20% of any gains; if the fund doesn't make
                money, there's no performance fee.
              </p>
            </div>
            <div className="overflow-hidden rounded-box border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">Structure</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Management fee, per year</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Share of profits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {FEES.map((f) => (
                    <tr key={f.name}>
                      <td className="px-5 py-4 font-medium">{f.name}</td>
                      <td className="tabular px-5 py-4 text-right text-muted">{f.management}</td>
                      <td className="tabular px-5 py-4 text-right text-muted">{f.performance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-8 border-b border-line">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-20 lg:px-10">
          <div className="relative aspect-[4/3] overflow-hidden rounded-box border border-line">
            <img
              src="/sword-stone.jpg"
              alt="A sword set in stone on a mountainside"
              className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
            />
          </div>
          <div>
            <h2 className="font-display text-4xl leading-tight lg:text-5xl">Why Arkhaios</h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              Arkhaios is Greek for "ancient". People have pooled their money to back a shared venture for
              as long as there have been markets, from merchant voyages to investment clubs that meet in
              someone's living room.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              We built Arkhaios so that kind of investing can happen in the open: one place to trade, to talk
              it through with friends, and to run or join a fund whose terms everyone can read.
            </p>
            <p className="mt-6 text-sm text-muted">
              Questions? Email{" "}
              <a href="mailto:support@arkhaios.io" className="text-marble underline-offset-2 hover:underline">
                support@arkhaios.io
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="relative isolate overflow-hidden">
        <img
          src="/bullvsBearPillar.jpg"
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_75%] opacity-35"
        />
        <div className="absolute inset-0 -z-10 bg-basalt/70" />
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-6 py-24 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div>
            <h2 className="font-display text-4xl leading-tight lg:text-5xl">Open an account in a few minutes.</h2>
            <p className="mt-4 max-w-lg text-muted">
              Sign up with your email, confirm it with a code, then verify your identity to start trading.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary px-6">Create an account</Link>
            <Link href="/login" className="btn btn-ghost border border-marble/25 px-6 text-marble hover:bg-marble/10">Sign in</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
