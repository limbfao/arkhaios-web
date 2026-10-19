'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import {
  HomeIcon,
  UserGroupIcon,
  BanknotesIcon,
  AdjustmentsVerticalIcon,
  ChatBubbleLeftRightIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import UserContext from "./UserContext";

export default function SideBar() {
  const { user } = useContext(UserContext);
  const pathname = usePathname();
  const managesFund = user.fundsManaging?.length > 0;

  const items = [
    { href: "/home", label: "Home", icon: HomeIcon },
    { href: "/dashboard", label: managesFund ? "Fund dashboard" : "Start a fund", icon: UserGroupIcon },
    ...(managesFund ? [
      { href: "/fundFinances", label: "Fund finances", icon: BanknotesIcon },
      { href: "/funds-home", label: "Fund settings", icon: AdjustmentsVerticalIcon },
    ] : []),
    { href: "/friends", label: "Friends", icon: ChatBubbleLeftRightIcon },
    { href: "/inbox", label: "Inbox", icon: InboxIcon },
  ];

  return (
    <nav className="flex h-full flex-col items-center gap-1 py-4" aria-label="Main">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <div key={href} className="tooltip tooltip-right" data-tip={label}>
            <Link
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-11 w-11 items-center justify-center rounded-btn transition-colors ${
                active ? "bg-slate text-bronze" : "text-muted hover:bg-stone hover:text-marble"
              }`}
            >
              {active ? <span className="absolute -left-2.5 h-5 w-0.5 rounded-full bg-bronze" /> : null}
              <Icon className="h-5 w-5" />
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
