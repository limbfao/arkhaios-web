"use client";

// Building blocks shared by the fund pages (PM console, finances, settings, public fund page)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useFetch from "../hooks/useFetch";
import { EmptyState, ErrorState, Skeleton } from "../components/ui";
import {
  changeColor, formatCurrency, formatDate, formatPercent, formatSignedCurrency, timeAgo,
} from "../lib/format";
import PriceChart from "../markets/components/PriceChart";
import RangeTabs from "../markets/components/RangeTabs";
import { hoverLabel, toPoints } from "../markets/components/chartConfig";

import { PERIODS, FEE_TYPES, periodInfo, feeInfo, feeSentence, termInfo } from "./fundTerms";
export { PERIODS, FEE_TYPES, periodInfo, feeInfo, feeSentence, termInfo };

// ---------- small display pieces ----------

export function StageBadge({ stage }) {
  const recruiting = stage === "recruiting";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        recruiting ? "border-bronze/40 bg-bronze/10 text-bronze" : "border-gain/30 bg-gain/10 text-gain"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${recruiting ? "bg-bronze" : "bg-gain"}`} aria-hidden="true" />
      {recruiting ? "Recruiting" : "Trading"}
    </span>
  );
}

export function SymbolTag({ symbol }) {
  return (
    <span className="rounded-md border border-line bg-basalt px-2 py-0.5 text-xs font-semibold tracking-wide text-muted">
      {symbol}
    </span>
  );
}

export function Initials({ name = "", size = 36 }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-slate text-xs font-semibold text-marble"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}

// Live countdown to `end` (ms). Renders nothing time-dependent on the server to avoid mismatches.
export function Countdown({ end, compact = false }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!end) return <span className="text-sm text-muted">Not scheduled</span>;
  if (now === null) return <Skeleton className={compact ? "h-5 w-32" : "h-10 w-56"} />;

  const left = Math.max(0, end - now);
  const s = Math.floor(left / 1000);
  const parts = [
    ["days", Math.floor(s / 86400)],
    ["hrs", Math.floor((s % 86400) / 3600)],
    ["min", Math.floor((s % 3600) / 60)],
    ["sec", s % 60],
  ];

  if (compact) {
    return (
      <span className="tabular text-sm text-marble">
        {parts[0][1]}d {parts[1][1]}h {parts[2][1]}m
      </span>
    );
  }

  return (
    <div className="flex items-end gap-4" role="timer" aria-label={`${parts[0][1]} days ${parts[1][1]} hours left`}>
      {parts.map(([unit, n]) => (
        <div key={unit}>
          <div className="stat-value text-3xl font-semibold text-marble">{String(n).padStart(2, "0")}</div>
          <div className="text-xs text-muted">{unit}</div>
        </div>
      ))}
    </div>
  );
}

export function TermPanelBody({ fund, details = true }) {
  // Recompute once a minute so the progress bar and dates stay current
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const term = useMemo(() => termInfo(fund, now), [fund, now]);
  const period = periodInfo(fund.fundDisbursementPeriod);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm text-muted">
            {term.stage === "recruiting" ? "Recruiting ends in" : `Term ${term.term} ends in`}
          </span>
          <StageBadge stage={term.stage} />
        </div>
        <Countdown end={term.end} />
      </div>
      {term.end ? (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-basalt" aria-hidden="true">
            <div className="h-full rounded-full bg-bronze" style={{ width: `${Math.round(term.progress * 100)}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{term.start ? formatDate(term.start, { time: false }) : ""}</span>
            <span>{formatDate(term.end, { time: term.end - (term.start || 0) < 2 * 86400000 })}</span>
          </div>
        </div>
      ) : null}
      {details ? <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
        <div>
          <dt className="text-muted">Term length</dt>
          <dd className="mt-0.5 text-marble">{period.label}</dd>
        </div>
        <div>
          <dt className="text-muted">Fees</dt>
          <dd className="mt-0.5 text-marble">
            <FeeTip value={fund.disbursementType} />
          </dd>
        </div>
      </dl> : null}
    </div>
  );
}

export function FeeTip({ value }) {
  return (
    <span className="tooltip tooltip-bottom inline-flex items-center gap-1 text-left" data-tip={feeSentence(value)}>
      <span>{value}</span>
      <span className="text-xs text-muted underline decoration-dotted underline-offset-2">What is this?</span>
    </span>
  );
}

// ---------- toast ----------

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, type = "success") => {
    clearTimeout(timer.current);
    setToast({ message, type, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const node = toast ? (
    <div className="toast toast-end toast-bottom z-[120]" role="status" aria-live="polite">
      <div
        className={`flex max-w-sm items-start gap-3 rounded-box border bg-stone px-4 py-3 text-sm shadow-lg ${
          toast.type === "error" ? "border-loss/40" : "border-gain/40"
        }`}
      >
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${toast.type === "error" ? "bg-loss" : "bg-gain"}`} aria-hidden="true" />
        <span className="text-marble">{toast.message}</span>
      </div>
    </div>
  ) : null;

  return [node, show];
}

// POST JSON and return the parsed body (or a failure shape on network errors)
export async function postJSON(url, body) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok && data.status === "success", ...data };
  } catch (e) {
    return { ok: false, message: "Network error. Check your connection and try again." };
  }
}

// ---------- fund value chart ----------

export const FUND_RANGES = [
  { key: "1D", period: "1d", intraday: true, label: "Today" },
  { key: "1W", period: "1w", intraday: true, label: "Past week" },
  { key: "1M", period: "1m", intraday: false, label: "Past month" },
];

// Value chart for a fund symbol with 1D/1W/1M ranges. `onLatest` receives the latest value.
export function FundValueChart({ symbol, title = "Fund value", height = 300, onLatest, aside }) {
  const [rangeKey, setRangeKey] = useState("1M");
  const [hover, setHover] = useState(null);
  const range = FUND_RANGES.find((r) => r.key === rangeKey);

  const { responseJSON, isLoading, error, reload } = useFetch(
    `/api/fund/history?symbol=${encodeURIComponent(symbol)}&period=${range.period}`
  );

  const points = useMemo(
    () => toPoints(responseJSON?.timestamps, responseJSON?.value),
    [responseJSON]
  );
  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  const shown = hover?.value ?? last;
  const change = Number.isFinite(shown) && Number.isFinite(first) ? shown - first : null;
  const changePct = change !== null && first ? change / first : null;
  const hasData = points.length > 1;

  useEffect(() => {
    if (onLatest && Number.isFinite(last)) onLatest(last);
  }, [last, onLatest]);

  return (
    <section className="panel" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
        <div>
          <div className="text-sm text-muted">{title}</div>
          {isLoading ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : Number.isFinite(shown) ? (
            <>
              <div className="stat-value mt-1 text-4xl font-semibold tracking-tight text-marble">{formatCurrency(shown)}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm">
                <span className={`tabular font-medium ${changeColor(change)}`}>
                  {formatSignedCurrency(change)} ({formatPercent(changePct)})
                </span>
                <span className="text-muted">{hover ? hoverLabel(hover.time, range.intraday) : range.label}</span>
              </div>
            </>
          ) : (
            <div className="stat-value mt-1 text-4xl font-semibold text-muted">—</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {aside}
          <RangeTabs ranges={FUND_RANGES} value={rangeKey} onChange={(k) => { setHover(null); setRangeKey(k); }} />
        </div>
      </div>
      <div className="relative px-2 pb-3 pt-4" style={{ minHeight: height + 28 }}>
        {error ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <ErrorState message="Fund history couldn't be loaded." onRetry={reload} />
          </div>
        ) : !isLoading && !hasData ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <EmptyState
              title="No history yet"
              description="The value chart starts once the fund holds cash or positions."
            />
          </div>
        ) : (
          <>
            <PriceChart
              data={points}
              intraday={range.intraday}
              height={height}
              color="bronze"
              onHover={setHover}
            />
            {isLoading ? (
              <div className="absolute inset-x-5 bottom-3 top-4">
                <Skeleton className="h-full w-full opacity-40" />
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

// ---------- announcements ----------

export function AnnouncementList({ announcements, emptyText = "No announcements yet." }) {
  if (!announcements?.length) {
    return <EmptyState title={emptyText} description="Updates from the portfolio manager appear here." />;
  }
  return (
    <ol className="divide-y divide-line">
      {announcements.map((a, i) => (
        <li key={`${a.time}-${i}`} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-medium text-marble">{a.title}</h3>
            <time className="shrink-0 text-xs text-muted" dateTime={new Date(a.time * 1000).toISOString()}
              title={formatDate(a.time * 1000)}>
              {timeAgo(a.time * 1000)}
            </time>
          </div>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{a.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function AnnouncementComposer({ fundID, onPosted, notify }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Add a subject and a message.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await postJSON("/api/fund/announcement", { id: fundID, title, body });
    setBusy(false);
    if (result.ok) {
      setTitle("");
      setBody("");
      notify?.("Announcement posted to members.");
      onPosted?.(result.data);
    } else {
      setError(result.message || "The announcement couldn't be posted.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div>
        <label className="field-label" htmlFor="announcement-subject">Subject</label>
        <input id="announcement-subject" className="field" maxLength={120} value={title}
          onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q4 rebalance complete" />
      </div>
      <div>
        <label className="field-label" htmlFor="announcement-body">Message</label>
        <textarea id="announcement-body" className="field min-h-[96px] resize-y" maxLength={2000} value={body}
          onChange={(e) => setBody(e.target.value)} placeholder="Share what changed and why." />
      </div>
      {error ? <p className="text-sm text-loss" role="alert">{error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted">Visible to members and on the public fund page.</span>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : null}
          Post announcement
        </button>
      </div>
    </form>
  );
}

// Announcements with live refresh after posting
export function useAnnouncements(fundID, initial) {
  const [list, setList] = useState(initial || []);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/fund/announcement?id=${encodeURIComponent(fundID)}`);
      const data = await r.json();
      if (data.status === "success") setList(data.data);
    } catch (e) {}
  }, [fundID]);
  return [list, refresh];
}

// ---------- join requests ----------

export function JoinRequests({ fundID, requests, isLoading, error, onRetry, onChange, notify }) {
  const [busy, setBusy] = useState(null);

  async function respond(request, action) {
    setBusy(request.id + action);
    const result = await postJSON("/api/fund/join", { fundID, type: "response", action, requester: request.id });
    setBusy(null);
    if (result.ok) {
      notify?.(action === "accept" ? `${request.name} joined the fund.` : `Declined ${request.name}'s request.`);
      onChange?.();
    } else {
      notify?.(result.message || "That didn't work. Try again.", "error");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (error) return <ErrorState message="Join requests couldn't be loaded." onRetry={onRetry} />;
  if (!requests?.length) {
    return <EmptyState title="No pending requests" description="New requests to join appear here for you to review." />;
  }

  return (
    <ul className="divide-y divide-line">
      {requests.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start gap-3 py-4 first:pt-0 last:pb-0">
          <Initials name={r.name} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium text-marble">{r.name}</span>
              {r.username ? <span className="text-xs text-muted">@{r.username}</span> : null}
            </div>
            {r.inquiry ? (
              <p className="mt-1 border-l-2 border-line pl-3 text-sm text-muted">{r.inquiry}</p>
            ) : (
              <p className="mt-1 text-sm italic text-muted">No message included.</p>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={Boolean(busy)}
              onClick={() => respond(r, "accept")}>
              {busy === r.id + "accept" ? <span className="loading loading-spinner loading-xs" /> : null}
              Accept
            </button>
            <button type="button" className="btn btn-ghost btn-sm border border-line" disabled={Boolean(busy)}
              onClick={() => respond(r, "reject")}>
              {busy === r.id + "reject" ? <span className="loading loading-spinner loading-xs" /> : null}
              Deny
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
