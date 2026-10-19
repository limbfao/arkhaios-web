import Link from "next/link";

// Split layout shared by sign in, sign up, verification and recovery:
// statue photograph on the left, a single focused form on the right.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen w-full bg-basalt lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src="/auth-statues.jpg"
          alt="Marble statues of a bull and a bearded figure against a blue sky"
          className="absolute inset-0 h-full w-full object-cover object-[30%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-basalt via-basalt/30 to-basalt/10" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <BrandLink />
          <div className="max-w-md">
            <p className="font-display text-3xl leading-snug text-marble">
              Invest on your own, or pool capital with people you trust.
            </p>
            <p className="mt-3 text-sm text-marble/70">
              Stocks, crypto and investment funds run by people you know.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
        <div className="lg:hidden">
          <BrandLink />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-4xl leading-tight text-marble">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-muted">{footer}</div>}
          </div>
        </div>
        <p className="text-center text-xs text-muted/70">
          <Link href="/legal/terms" className="hover:text-marble">Terms</Link>
          <span className="mx-2">·</span>
          <Link href="/legal/privacy" className="hover:text-marble">Privacy</Link>
          <span className="mx-2">·</span>
          <Link href="/legal/disclosures" className="hover:text-marble">Disclosures</Link>
        </p>
      </div>
    </div>
  );
}

export function BrandLink({ className = "" }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 text-marble ${className}`}>
      <img src="/logo-mark.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
      <span className="font-display text-xl tracking-wide">Arkhaios</span>
    </Link>
  );
}
