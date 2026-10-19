import Link from "next/link";

// Full-height message used by the 404 and error pages. Works both inside the
// signed-in app shell and on its own for signed-out visitors.
export default function StatusScreen({ code, title, children, actions, inApp }) {
  return (
    <div className={`flex w-full items-center justify-center px-6 ${inApp ? "min-h-[calc(100vh-4rem)]" : "min-h-screen"} bg-basalt`}>
      <div className="w-full max-w-md text-center">
        {!inApp && (
          <Link href="/" className="mb-10 inline-flex items-center gap-2.5 text-marble">
            <img src="/logo-mark.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-display text-xl tracking-wide">Arkhaios</span>
          </Link>
        )}
        {code && <p className="font-display text-7xl leading-none text-bronze/80">{code}</p>}
        <h1 className="mt-5 font-display text-3xl leading-tight text-marble">{title}</h1>
        <div className="mt-3 text-sm leading-relaxed text-muted">{children}</div>
        {actions && <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
