"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HeartIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

const LINKS = [
  { href: "/account/settings", label: "Overview", icon: Squares2X2Icon },
  { href: "/account/settings/personal-information", label: "Personal information", icon: IdentificationIcon },
  { href: "/account/settings/security-privacy", label: "Security", icon: ShieldCheckIcon },
  { href: "/account/settings/beneficiaries", label: "Beneficiaries", icon: HeartIcon },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings" className="flex gap-1 overflow-x-auto lg:flex-col">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 whitespace-nowrap rounded-btn px-3 py-2 text-sm transition-colors ${
              active ? "bg-slate font-medium text-marble" : "text-muted hover:bg-stone hover:text-marble"
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? "text-bronze" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
