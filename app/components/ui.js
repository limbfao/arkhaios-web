"use client";

// Shared building blocks for app pages: panels, stats, and loading/empty/error states

import { changeColor, formatPercent } from "../lib/format";

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="page-title truncate">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, actions, children, className = "", bodyClassName = "p-5" }) {
  return (
    <section className={`panel ${className}`}>
      {title || actions ? (
        <div className="panel-header">
          {title ? <h2 className="panel-title">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, className = "" }) {
  return (
    <div className={className}>
      <div className="text-sm text-muted">{label}</div>
      <div className="stat-value mt-1 text-2xl font-semibold text-marble">{value}</div>
      {hint ? <div className="mt-1 text-sm">{hint}</div> : null}
    </div>
  );
}

// Signed percent change colored by direction; `value` is a fraction unless isPercent
export function Change({ value, isPercent = false, className = "" }) {
  return (
    <span className={`tabular ${changeColor(value)} ${className}`}>
      {formatPercent(value, { isPercent })}
    </span>
  );
}

export function Skeleton({ className = "h-4 w-full" }) {
  return <div className={`animate-pulse rounded bg-slate ${className}`} />;
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm font-medium text-marble">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message = "This couldn't be loaded.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm text-loss">{message}</p>
      {onRetry ? (
        <button className="btn btn-ghost btn-sm mt-3" onClick={onRetry}>Try again</button>
      ) : null}
    </div>
  );
}

// Small logo for a stock or crypto symbol, falling back to its initials
export function AssetLogo({ symbol = "", size = 32 }) {
  const clean = symbol.replace(/[-/]?USD$/i, "").toUpperCase();
  const isCrypto = /USD$/i.test(symbol) && clean !== symbol.toUpperCase();
  const src = isCrypto
    ? `https://assets.coincap.io/assets/icons/${clean.toLowerCase()}@2x.png`
    : `https://logos.stockanalysis.com/${clean.toLowerCase()}.svg`;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate text-[10px] font-semibold text-muted"
      style={{ width: size, height: size }}
    >
      {clean.slice(0, 2)}
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full bg-marble object-contain p-1"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    </span>
  );
}
