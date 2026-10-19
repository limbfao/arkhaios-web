import Link from "next/link";
import { cookies } from "next/headers";
import { SiteNav, SiteFooter, CONTACT_EMAIL } from "./SiteChrome";

// Shared layout for /legal/* pages. `sections` is [{ title, body: [paragraph, ...] }].
export default function LegalPage({ title, updated, intro, sections }) {
  const others = [
    { href: "/legal/terms", label: "Terms of use" },
    { href: "/legal/privacy", label: "Privacy policy" },
    { href: "/legal/disclosures", label: "Disclosures" },
  ];
  // Signed-in visitors already get the app header and sidebar from the root layout
  const inApp = !!cookies().get("session")?.value;
  return (
    <div className="min-h-screen bg-basalt text-marble">
      {!inApp && <SiteNav />}
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-16 lg:grid-cols-[220px_1fr] lg:px-10">
        <nav aria-label="Legal documents" className="lg:pt-3">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm lg:flex-col lg:gap-3">
            {others.map((o) => (
              <li key={o.href}>
                <Link
                  href={o.href}
                  className={o.label === title ? "font-medium text-bronze" : "text-muted hover:text-marble"}
                  aria-current={o.label === title ? "page" : undefined}
                >
                  {o.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-2xl">
          <h1 className="page-title">{title}</h1>
          <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
          <p className="mt-8 text-base leading-relaxed text-marble/90">{intro}</p>
          {sections.map((s) => (
            <section key={s.title} className="mt-10">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-3 text-sm leading-relaxed text-muted">{p}</p>
              ))}
            </section>
          ))}
          <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
            Questions about this document? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-marble underline-offset-2 hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </article>
      </div>
      {!inApp && <SiteFooter />}
    </div>
  );
}
