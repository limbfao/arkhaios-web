import Link from "next/link";
import { BrandLink } from "./AuthShell";

export const CONTACT_EMAIL = "support@arkhaios.io";

// Top navigation for the public marketing and legal pages.
// `overlay` floats it over the landing hero instead of sitting on the page background.
export function SiteNav({ overlay = false }) {
  const links = [
    { href: "/#trading", label: "Trading" },
    { href: "/#funds", label: "Funds" },
    { href: "/#how-funds-work", label: "How funds work" },
    { href: "/#about", label: "About" },
  ];
  return (
    <header className={`${overlay ? "absolute inset-x-0 top-0 z-20" : "border-b border-line"} w-full`}>
      <nav className="mx-auto flex h-20 max-w-[1200px] items-center justify-between gap-6 px-6 lg:px-10" aria-label="Main">
        <BrandLink />
        <ul className="hidden items-center gap-8 text-sm text-marble/80 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-marble">{l.label}</a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost btn-sm text-marble hover:bg-marble/10">Sign in</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Create account</Link>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const columns = [
    {
      title: "Product",
      links: [
        { href: "/#trading", label: "Stocks and crypto" },
        { href: "/#funds", label: "Funds" },
        { href: "/#how-funds-work", label: "How funds work" },
        { href: "/signup", label: "Create an account" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/#about", label: "About Arkhaios" },
        { href: `mailto:${CONTACT_EMAIL}`, label: "Contact support" },
        { href: "/login", label: "Sign in" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/legal/terms", label: "Terms of use" },
        { href: "/legal/privacy", label: "Privacy policy" },
        { href: "/legal/disclosures", label: "Disclosures" },
      ],
    },
  ];

  return (
    <footer className="border-t border-line bg-basalt">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div>
          <BrandLink />
          <p className="mt-4 max-w-xs text-sm text-muted">
            A brokerage for stocks and crypto, with investment funds you can start or join.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-sm font-semibold text-marble">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") && !l.href.includes("#") ? (
                    <Link href={l.href} className="transition-colors hover:text-marble">{l.label}</Link>
                  ) : (
                    <a href={l.href} className="transition-colors hover:text-marble">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-[1200px] space-y-3 px-6 py-8 text-xs leading-relaxed text-muted/80 lg:px-10">
          <p>
            Investing involves risk, including the possible loss of the money you invest. Cryptocurrency is
            highly volatile and is not protected by SIPC. Funds on Arkhaios are run by their portfolio managers,
            not by Arkhaios, and past performance does not guarantee future results. Nothing on this site is
            investment advice. See our <Link href="/legal/disclosures" className="underline underline-offset-2 hover:text-marble">disclosures</Link>.
          </p>
          <p>© {year} Arkhaios. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
