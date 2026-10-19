"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { CheckBadgeIcon } from "@heroicons/react/20/solid";
import UserContext from "../UserContext";
import { Avatar, Badge } from "./accountUi";
import { formatDate } from "../lib/format";

const TABS = [
  { href: "/account/profile", label: "Overview" },
  { href: "/account/investing", label: "Investing" },
  { href: "/account/transfers", label: "Transfers" },
  { href: "/account/reports-statements", label: "Statements" },
  { href: "/account/settings", label: "Settings" },
  { href: "/account/help", label: "Help" },
];

export default function AccountHeader() {
  const pathname = usePathname();
  const { user } = useContext(UserContext);

  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar firstName={user.firstName} lastName={user.lastName} seed={user.accountID} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title truncate">{user.firstName} {user.lastName}</h1>
            {user.kycVerified ? (
              <Badge tone="gain"><CheckBadgeIcon className="h-3.5 w-3.5" />Verified</Badge>
            ) : (
              <Badge tone="bronze">Verification needed</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            <span className="text-marble/85">@{user.username}</span>
            {user.creationTime ? <> · Member since {formatDate(user.creationTime, { time: false })}</> : null}
          </p>
        </div>
      </div>

      <nav aria-label="Account sections" className="mt-7 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative whitespace-nowrap px-4 pb-3 pt-1 text-sm transition-colors ${
                active ? "font-medium text-marble" : "text-muted hover:text-marble"
              }`}
            >
              {label}
              {active ? <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-bronze" /> : null}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
