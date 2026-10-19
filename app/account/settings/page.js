"use client";

import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import {
  BuildingLibraryIcon,
  EnvelopeIcon,
  HeartIcon,
  IdentificationIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import UserContext from "../../UserContext";
import { Badge, Card } from "../accountUi";

function SettingRow({ href, icon: Icon, title, description, status }) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-slate text-muted">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-marble">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      </span>
      {status}
      {href ? <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" /> : null}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate/40">{content}</Link>
      ) : (
        <div className="flex items-center gap-4 px-5 py-4">{content}</div>
      )}
    </li>
  );
}

export default function Page() {
  const { user } = useContext(UserContext);
  const [beneficiaries, setBeneficiaries] = useState(null);

  useEffect(() => {
    fetch("/api/account/beneficiaries")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBeneficiaries(d?.data || []))
      .catch(() => setBeneficiaries([]));
  }, []);

  const banks = (user.bank_accounts || []).flat().filter(Boolean);

  return (
    <div className="space-y-6">
      <Card title="Account settings" description="Manage your identity, sign-in security and account preferences" bodyClassName="">
        <ul className="divide-y divide-line">
          <SettingRow
            href="/account/settings/personal-information"
            icon={IdentificationIcon}
            title="Identity verification"
            description={user.kycVerified ? "Your identity has been verified for trading." : "Required before you can trade or move money."}
            status={user.kycVerified ? <Badge tone="gain">Verified</Badge> : <Badge tone="bronze">Action needed</Badge>}
          />
          <SettingRow
            href="/account/settings/security-privacy"
            icon={ShieldCheckIcon}
            title="Two-factor authentication"
            description="Require a code from your authenticator app when you sign in."
            status={user.mfaVerified ? <Badge tone="gain">On</Badge> : <Badge>Off</Badge>}
          />
          <SettingRow
            href="/account/settings/beneficiaries"
            icon={HeartIcon}
            title="Beneficiaries"
            description="Choose who receives this account if something happens to you."
            status={beneficiaries === null ? null : (
              <Badge>{beneficiaries.length ? `${beneficiaries.length} added` : "None added"}</Badge>
            )}
          />
          <SettingRow
            href="/account/transfers"
            icon={BuildingLibraryIcon}
            title="Linked banks"
            description="Bank accounts used for deposits and withdrawals."
            status={<Badge>{banks.length} linked</Badge>}
          />
        </ul>
      </Card>

      <Card title="Sign-in details" bodyClassName="">
        <ul className="divide-y divide-line">
          <SettingRow icon={EnvelopeIcon} title="Email" description={user.email}
            status={user.emailVerified ? <Badge tone="gain">Confirmed</Badge> : <Badge tone="bronze">Unconfirmed</Badge>} />
          <SettingRow icon={IdentificationIcon} title="Username" description={`@${user.username}. Friends use it to find you.`} />
        </ul>
      </Card>
    </div>
  );
}
