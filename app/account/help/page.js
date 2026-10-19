import Link from "next/link";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { ChatBubbleLeftRightIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

export const metadata = { title: "Help · Arkhaios" };

const TOPICS = [
  {
    title: "Getting started",
    items: [
      ["Why do I need to verify my identity?",
        "Arkhaios accounts are held at Alpaca Securities LLC, a FINRA-registered broker-dealer. Federal know-your-customer rules require us to confirm your legal name, date of birth, address and Social Security number before you can trade or move money. Start from Settings, then Personal information."],
      ["Who can open an account?",
        "Anyone 18 or older who is a US citizen and pays taxes in the United States."],
    ],
  },
  {
    title: "Deposits and withdrawals",
    items: [
      ["How long do deposits take?",
        "Deposits are made by ACH from a linked bank and usually settle in 1 to 3 business days. You can follow each transfer's status under Account, then Transfers."],
      ["How much can I withdraw?",
        "You can withdraw settled cash. Proceeds from a sale settle one business day after the trade."],
      ["How do I link a bank?",
        "Go to Account, then Transfers, and select Link bank. You can link checking and savings accounts at most US banks."],
    ],
  },
  {
    title: "Funds",
    items: [
      ["What is a fund?",
        "A fund pools money from members and is traded by one or more portfolio managers. Members share in gains and losses in proportion to what they put in, minus the fees the fund sets."],
      ["How are fund fees charged?",
        "Each fund shows its fee structure, such as 2/20 (a 2% yearly management fee and 20% of profits), and how often payouts happen. Fees are taken when the fund disburses."],
    ],
  },
  {
    title: "Security and documents",
    items: [
      ["How do I turn on two-factor authentication?",
        "Go to Settings, then Security, and select Set up two-factor authentication. Scan the QR code with an authenticator app and enter the code it shows."],
      ["Where are my statements and tax forms?",
        "Monthly statements, trade confirmations and year-end tax forms are under Account, then Statements. Each can be downloaded as a PDF."],
      ["Is my money protected?",
        "Securities held at Alpaca are protected by SIPC up to $500,000, including $250,000 for cash. SIPC does not protect against market losses."],
    ],
  },
];

export default function Page() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-8">
        {TOPICS.map((topic) => (
          <div key={topic.title}>
            <h2 className="mb-3 text-sm font-semibold text-marble">{topic.title}</h2>
            <div className="panel divide-y divide-line">
              {topic.items.map(([q, a]) => (
                <details key={q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm text-marble hover:bg-slate/40 [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDownIcon className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      <aside className="space-y-4 lg:pt-8">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold text-marble">Still need help?</h2>
          <p className="mt-1 text-sm text-muted">Our team replies within one business day.</p>
          <a href="mailto:support@arkhaios.io" className="btn btn-primary btn-sm mt-4 w-full">
            <EnvelopeIcon className="h-4 w-4" /> Email support
          </a>
        </div>
        <div className="panel p-5">
          <h2 className="text-sm font-semibold text-marble">Questions about a fund?</h2>
          <p className="mt-1 text-sm text-muted">Portfolio managers can answer questions about their strategy directly.</p>
          <Link href="/friends" className="btn btn-ghost btn-sm mt-4 w-full border border-line">
            <ChatBubbleLeftRightIcon className="h-4 w-4" /> Open messages
          </Link>
        </div>
        <p className="px-1 text-xs leading-relaxed text-muted">
          Brokerage services are provided by Alpaca Securities LLC, member FINRA/SIPC. Investing involves risk, including
          the possible loss of principal.
        </p>
      </aside>
    </div>
  );
}
