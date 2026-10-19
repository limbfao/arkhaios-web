"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import Search from "./components/search";
import { timeAgo } from "./lib/format";
import "./globals.css";

const NAV = [
  { href: "/markets", label: "Markets" },
  { href: "/friends", label: "Friends" },
];

function sameSection(href, pathname) {
  const a = href.split("/").filter(Boolean)[0];
  const b = pathname.split("/").filter(Boolean)[0];
  return !!a && a === b;
}

export default function Header({ user }) {
  const pathname = usePathname();
  const [eventList, setEventList] = useState([]);
  const unread = eventList.filter((event) => !event.read).length;

  async function readNotification(id) {
    setEventList((list) => list.map((event) => (event.id == id ? { ...event, read: true } : event)));

    await fetch("/api/account/read-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    });
  }

  useEffect(() => {
    fetch("/api/account/notifications")
      .then((response) => response.json())
      .then((json) => setEventList(json.data || []))
      .catch(() => {});

    // Live notifications come from the compute service, which only exists in production
    // unless NEXT_PUBLIC_EVENTS_URL points somewhere else
    const eventsURL = process.env.NEXT_PUBLIC_EVENTS_URL ||
      (process.env.NODE_ENV === "production" ? "https://compute.arkhaios.io/api/events" : null);

    if(!eventsURL) return;

    const events = new EventSource(eventsURL, { withCredentials: true });

    events.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setEventList((eventList) => [message, ...eventList]);
      } catch(e) {}
    };

    return () => {
      events.close();
    }
  }, []);

  async function logout() {
    try {
      const response = await fetch("/api/account/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.status === 200) window.location.href = "/";
    } catch (error) {
      console.log(error);
    }
  }

  const navClass = (href) =>
    `rounded-btn px-3 py-2 text-sm font-medium transition-colors ${
      sameSection(href, pathname) ? "text-marble bg-slate" : "text-muted hover:text-marble"
    }`;

  const unreadEvents = eventList.filter((event) => !event.read).slice(0, 5);

  return (
    <div className="flex h-16 items-center gap-6 px-4">
      <Link href="/home" className="flex shrink-0 items-center gap-2.5" aria-label="Arkhaios home">
        <img src="/logo-mark.png" alt="" width={34} height={34} />
        <span className="font-display text-xl tracking-wide text-marble">Arkhaios</span>
      </Link>

      <div className="flex flex-1 justify-center">
        <Search />
      </div>

      <nav className="flex items-center gap-1">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={navClass(item.href)}>
            {item.label}
          </Link>
        ))}

        <div className="dropdown dropdown-end">
          <button
            tabIndex={0}
            className="btn btn-ghost btn-sm btn-square relative text-muted hover:text-marble"
            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          >
            <BellIcon className="h-5 w-5" />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bronze px-1 text-[10px] font-semibold text-basalt">
                {unread}
              </span>
            ) : null}
          </button>
          <div tabIndex={0} className="dropdown-content z-[110] mt-2 w-80 overflow-hidden rounded-box border border-line bg-stone shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              <Link href="/inbox" className="text-xs text-bronze hover:text-bronze-light">View all</Link>
            </div>
            {unreadEvents.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto">
                {unreadEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      onClick={() => readNotification(event.id)}
                      className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-bronze" />
                      <span className="min-w-0">
                        <span className="block text-sm text-marble">{event.message}</span>
                        <span className="mt-0.5 block text-xs text-muted">{timeAgo(event.time)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted">You're all caught up.</p>
            )}
          </div>
        </div>

        <div className="dropdown dropdown-end">
          <button tabIndex={0} className="ml-1 flex items-center gap-2 rounded-btn p-1 pr-2 transition-colors hover:bg-slate">
            <img alt="" src="/avatar.png" className="h-8 w-8 rounded-full" />
            <span className="hidden text-sm font-medium text-marble lg:block">{user.firstName}</span>
          </button>
          <ul tabIndex={0} className="menu dropdown-content z-[110] mt-2 w-60 rounded-box border border-line bg-stone p-2 shadow-2xl">
            <li className="pointer-events-none mb-1">
              <div className="flex flex-col items-start gap-0">
                <span className="text-sm font-semibold text-marble">{user.firstName} {user.lastName}</span>
                <span className="text-xs text-muted">{user.email}</span>
              </div>
            </li>
            <li><Link href="/account/profile">Profile</Link></li>
            <li><Link href="/account/investing">Investing</Link></li>
            <li><Link href="/account/transfers">Transfers</Link></li>
            <li><Link href="/account/reports-statements">Reports & statements</Link></li>
            <li><Link href="/account/settings/personal-information">Settings</Link></li>
            <li><Link href="/account/help">Help</Link></li>
            <div className="my-1 border-t border-line" />
            <li><button onClick={logout}>Sign out</button></li>
          </ul>
        </div>
      </nav>
    </div>
  );
}
