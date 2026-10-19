"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowsRightLeftIcon,
  BellIcon,
  ChartBarIcon,
  DocumentTextIcon,
  MegaphoneIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { PageHeader, EmptyState, ErrorState, SkeletonRows } from "../components/ui";
import { formatDate, timeAgo } from "../lib/format";
import { fetchJSON } from "../account/accountUi";

// Pick an icon from what the notification is about
function iconFor(message = "") {
  const m = message.toLowerCase();
  if (/order|filled|bought|sold/.test(m)) return ChartBarIcon;
  if (/deposit|withdraw|transfer/.test(m)) return ArrowsRightLeftIcon;
  if (/request|joined|join|friend/.test(m)) return UserPlusIcon;
  if (/announcement|posted/.test(m)) return MegaphoneIcon;
  if (/statement|document|tax/.test(m)) return DocumentTextIcon;
  return BellIcon;
}

const FILTERS = [["all", "All"], ["unread", "Unread"]];

export default function Page() {
  const [state, setState] = useState({ loading: true, error: false, events: [] });
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const { data } = await fetchJSON("/api/account/notifications");
      setState({ loading: false, error: false, events: data || [] });
    } catch (e) {
      setState({ loading: false, error: true, events: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Let other parts of the app (like the header bell) know the unread count changed
  function announce(events) {
    const unread = events.filter((e) => !e.read).length;
    window.dispatchEvent(new CustomEvent("notifications:changed", { detail: { unread } }));
  }

  async function markRead(id) {
    const target = state.events.find((e) => e.id === id);
    if (!target || target.read) return;
    const events = state.events.map((e) => (e.id === id ? { ...e, read: true } : e));
    setState((s) => ({ ...s, events }));
    announce(events);
    fetch("/api/account/read-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function markAllRead() {
    const events = state.events.map((e) => ({ ...e, read: true }));
    setState((s) => ({ ...s, events }));
    announce(events);
    fetch("/api/account/read-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  const unread = state.events.filter((e) => !e.read).length;
  const visible = filter === "unread" ? state.events.filter((e) => !e.read) : state.events;

  return (
    <div className="page max-w-3xl">
      <PageHeader
        title="Inbox"
        subtitle={state.loading ? "Updates about your orders, transfers and funds" :
          unread ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You're all caught up"}
      />

      <div className="panel">
        <div className="panel-header">
          <div className="flex gap-1" role="tablist" aria-label="Filter notifications">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={`btn btn-xs font-normal ${filter === id ? "bg-slate text-marble" : "btn-ghost text-muted"}`}
              >
                {label}
                {id === "unread" && unread ? <span className="tabular text-bronze">{unread}</span> : null}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-xs font-normal text-muted hover:text-marble" onClick={markAllRead} disabled={!unread}>
            Mark all as read
          </button>
        </div>

        {state.loading ? (
          <div className="p-5"><SkeletonRows rows={5} /></div>
        ) : state.error ? (
          <ErrorState message="Your notifications couldn't be loaded." onRetry={load} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
            description={filter === "unread"
              ? "Everything here has been read."
              : "Order fills, transfers, fund requests and announcements will show up here."}
            action={filter === "unread" && state.events.length ? (
              <button className="btn btn-ghost btn-sm border border-line" onClick={() => setFilter("all")}>Show all</button>
            ) : null}
          />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((event) => {
              const Icon = iconFor(event.message);
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => markRead(event.id)}
                    className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-slate/40 ${event.read ? "" : "bg-bronze/5"}`}
                    aria-label={`${event.read ? "" : "Unread: "}${event.message}`}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${event.read ? "bg-slate text-muted" : "bg-bronze/15 text-bronze"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${event.read ? "text-muted" : "font-medium text-marble"}`}>{event.message}</span>
                      <time className="mt-0.5 block text-xs text-muted" dateTime={new Date(event.time).toISOString()} title={formatDate(event.time)}>
                        {timeAgo(event.time)}
                      </time>
                    </span>
                    {!event.read ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-bronze" aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
