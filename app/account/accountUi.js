"use client";

// Building blocks shared by the account, friends and inbox pages

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircleIcon, ExclamationCircleIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";

// Muted stone tones so avatars are distinguishable without competing with the accent
const AVATAR_TONES = ["#3b342b", "#2f3631", "#35313b", "#3b2f2f", "#2e3439", "#383427"];

function hashString(text = "") {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(firstName = "", lastName = "") {
  return ((firstName[0] || "") + (lastName[0] || "")).toUpperCase() || "?";
}

// "ACCOUNT_STATEMENT" -> "Account statement"
export function sentenceCase(text = "") {
  const t = String(text).replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function fullName(person) {
  if (!person) return "";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.username || "";
}

// Circle with a person's initials
export function Avatar({ firstName, lastName, seed, size = 40, className = "" }) {
  const tone = AVATAR_TONES[hashString(seed || `${firstName}${lastName}`) % AVATAR_TONES.length];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-marble ring-1 ring-inset ring-white/5 ${className}`}
      style={{ width: size, height: size, backgroundColor: tone, fontSize: Math.round(size * 0.38) }}
    >
      {initials(firstName, lastName)}
    </span>
  );
}

// Panel built on a div (the global `section` styles from the landing page would stretch a <section>)
export function Card({ title, description, actions, children, className = "", bodyClassName = "p-5", as: Tag = "div" }) {
  return (
    <Tag className={`panel ${className}`}>
      {title || actions ? (
        <div className="panel-header">
          <div className="min-w-0">
            {title ? <h2 className="panel-title">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}

const BADGE_TONES = {
  gain: "bg-gain/15 text-gain",
  loss: "bg-loss/15 text-loss",
  bronze: "bg-bronze/15 text-bronze",
  muted: "bg-slate text-muted",
};

export function Badge({ tone = "muted", children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

// Label / value rows for account details
export function DetailList({ children }) {
  return <dl className="divide-y divide-line">{children}</dl>;
}

export function DetailRow({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-marble">{children}</dd>
    </div>
  );
}

// Shown in place of brokerage features until the user has passed identity verification
export function VerifyNotice({ feature = "this page" }) {
  return (
    <div className="panel flex flex-wrap items-center gap-4 p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bronze/15 text-bronze">
        <ShieldExclamationIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-marble">Verify your identity to use {feature}</p>
        <p className="mt-0.5 text-sm text-muted">
          Federal rules require us to confirm who you are before you can trade or move money. It takes about five minutes.
        </p>
      </div>
      <Link href="/account/settings/personal-information" className="btn btn-primary btn-sm">
        Verify identity
      </Link>
    </div>
  );
}

// Transient confirmation in the bottom-right corner
export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((message, tone = "success") => {
    clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show];
}

export function Toast({ toast }) {
  if (!toast) return null;
  const Icon = toast.tone === "error" ? ExclamationCircleIcon : CheckCircleIcon;
  return (
    <div className="toast toast-end z-50" role="status" aria-live="polite">
      <div className="flex items-center gap-2.5 rounded-btn border border-line bg-slate px-4 py-3 text-sm text-marble shadow-lg">
        <Icon className={`h-5 w-5 ${toast.tone === "error" ? "text-loss" : "text-gain"}`} />
        {toast.message}
      </div>
    </div>
  );
}

// Small inline spinner for buttons (the global .loading class is taken by older pages)
export function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// fetch + JSON with a thrown error for non-2xx responses
export async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
  });
  let data = null;
  try { data = await response.json(); } catch (e) { /* empty body */ }
  if (!response.ok || data?.status === "failed" || data?.status === "error") {
    const error = new Error(data?.message || "Something went wrong. Try again.");
    error.data = data;
    throw error;
  }
  return data;
}
