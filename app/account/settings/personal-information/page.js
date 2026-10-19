"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckBadgeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import UserContext from "../../../UserContext.js";
import KYCForm from "./KYCFormFlow/KYCForm.js";
import { Badge, Card, DetailList, DetailRow, fetchJSON } from "../../accountUi";
import { ErrorState, Skeleton } from "../../../components/ui";
import { formatDate } from "../../../lib/format";

const VERIFY_STEPS = [
  ["Identity", "Legal name, date of birth and Social Security number"],
  ["Contact", "Home address and phone number"],
  ["Disclosures", "Four yes or no regulatory questions"],
  ["Agreement", "Review and accept the customer agreement"],
];

function VerifiedDetails() {
  const { user } = useContext(UserContext);
  const [state, setState] = useState({ loading: true, error: false, data: null });

  async function load() {
    setState({ loading: true, error: false, data: null });
    try {
      const { data } = await fetchJSON("/api/account/status");
      setState({ loading: false, error: false, data });
    } catch (e) {
      setState({ loading: false, error: true, data: null });
    }
  }
  useEffect(() => { load(); }, []);

  const identity = state.data?.identity || {};
  const contact = state.data?.contact || {};
  const dob = identity.date_of_birth ? new Date(...identity.date_of_birth.split("-").map((n, i) => (i === 1 ? n - 1 : +n))) : null;

  return (
    <Card
      title="Legal information"
      description="Used to verify your identity and on your tax documents"
      actions={<Badge tone="gain"><CheckBadgeIcon className="h-3.5 w-3.5" />Verified</Badge>}
    >
      {state.loading ? (
        <div className="space-y-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
      ) : state.error ? (
        <ErrorState message="Your details couldn't be loaded." onRetry={load} />
      ) : (
        <>
          <DetailList>
            <DetailRow label="Legal name">
              {[identity.given_name, identity.middle_name, identity.family_name].filter(Boolean).join(" ") ||
                `${user.firstName} ${user.lastName}`}
            </DetailRow>
            <DetailRow label="Date of birth">{dob ? formatDate(dob, { time: false }) : "—"}</DetailRow>
            <DetailRow label="Email">{contact.email_address || user.email}</DetailRow>
            <DetailRow label="Phone">{contact.phone_number || "—"}</DetailRow>
            <DetailRow label="Home address">
              {[contact.street_address?.join(" "), contact.unit].filter(Boolean).join(", ") || "—"}
              {contact.city ? <span className="block text-muted">{contact.city}, {contact.state} {contact.postal_code}</span> : null}
            </DetailRow>
            <DetailRow label="Citizenship and tax residence">United States</DetailRow>
            <DetailRow label="Verified on">{formatDate(state.data?.created_at, { time: false })}</DetailRow>
          </DetailList>
          <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
            Moved or changed your legal name? Contact support at{" "}
            <a href="mailto:support@arkhaios.io" className="text-bronze hover:text-bronze-light">support@arkhaios.io</a>{" "}
            and we'll update your records with our brokerage partner.
          </p>
        </>
      )}
    </Card>
  );
}

export default function Page() {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const dialog = useRef(null);
  const [formKey, setFormKey] = useState(0);

  function openForm() {
    setFormKey((k) => k + 1); // start fresh each time
    dialog.current?.showModal();
  }

  function finish() {
    dialog.current?.close();
    router.refresh(); // reload the user so the verified state shows
  }

  if (user.kycVerified) return <VerifiedDetails />;

  return (
    <>
      <Card title="Identity verification" actions={<Badge tone="bronze">Not verified</Badge>}>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="max-w-xl text-sm text-muted">
              Before you can trade, deposit or join a fund, federal rules require us to confirm who you are. Most people
              finish in about five minutes and are approved right away.
            </p>
            <ol className="mt-5 space-y-3">
              {VERIFY_STEPS.map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-xs text-muted">
                    {i + 1}
                  </span>
                  <span className="text-sm">
                    <span className="text-marble">{title}</span> <span className="text-muted">· {text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <button className="btn btn-primary" onClick={openForm}>Start verification</button>
        </div>
      </Card>

      <dialog ref={dialog} className="modal" aria-labelledby="kyc-title">
        <div className="modal-box max-w-3xl border border-line bg-stone p-0">
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 id="kyc-title" className="text-lg font-semibold text-marble">Verify your identity</h2>
            <button className="btn btn-ghost btn-sm btn-square" aria-label="Close" onClick={() => dialog.current?.close()}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <KYCForm key={formKey} onDone={finish} />
        </div>
      </dialog>
    </>
  );
}
