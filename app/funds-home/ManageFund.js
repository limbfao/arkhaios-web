"use client";

// Fund settings for the portfolio manager: profile, visibility, access code,
// join requests and announcements

import Link from "next/link";
import { useState } from "react";
import useFetch from "../hooks/useFetch";
import { Panel, Skeleton } from "../components/ui";
import { formatDate } from "../lib/format";
import {
  AnnouncementComposer, AnnouncementList, JoinRequests, StageBadge, SymbolTag, feeSentence, periodInfo,
  postJSON, termInfo, useAnnouncements, useToast,
} from "./fundKit";

export default function ManageFund({ fund, announcements: initialAnnouncements }) {
  const [toast, notify] = useToast();
  const [settings, setSettings] = useState({
    description: fund.fundDescription || "",
    publiclyAvailable: Boolean(fund.publiclyAvailable),
  });
  const members = useFetch(`/api/fund/members?id=${encodeURIComponent(fund.fundID)}`);
  const [announcements, refreshAnnouncements] = useAnnouncements(fund.fundID, initialAnnouncements);
  const term = termInfo(fund);

  async function save(update, success) {
    const result = await postJSON("/api/fund/settings", { id: fund.fundID, ...update });
    if (result.ok) {
      setSettings({ description: result.data.description, publiclyAvailable: result.data.publiclyAvailable });
      notify(success);
      return result.data;
    }
    notify(result.message || "Your changes couldn't be saved.", "error");
    return null;
  }

  return (
    <div className="page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <SymbolTag symbol={fund.fundSymbol} />
            <StageBadge stage={term.stage} />
          </div>
          <h1 className="page-title truncate">Fund settings</h1>
          <p className="mt-1.5 text-sm text-muted">Manage how {fund.fundName} appears and who can join.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/markets/funds/${fund.fundSymbol}`} className="btn btn-ghost btn-sm border border-line">View public page</Link>
          <Link href="/dashboard" className="btn btn-ghost btn-sm border border-line">Back to console</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProfilePanel fund={fund} description={settings.description} onSave={save} />
          <Panel title="Requests to join">
            <JoinRequests fundID={fund.fundID} requests={members.responseJSON?.data?.requests}
              isLoading={members.isLoading} error={members.error} onRetry={members.reload}
              onChange={members.reload} notify={notify} />
          </Panel>
          <Panel title="Post an announcement">
            <AnnouncementComposer fundID={fund.fundID} notify={notify} onPosted={refreshAnnouncements} />
          </Panel>
          <Panel title="Past announcements">
            <AnnouncementList announcements={announcements} />
          </Panel>
        </div>

        <div className="space-y-6">
          <VisibilityPanel isPublic={settings.publiclyAvailable}
            onChange={(value) => save({ publiclyAvailable: value },
              value ? "The fund is now public." : "The fund is now private. New members need the access code.")} />
          <AccessCodePanel fundID={fund.fundID} isPublic={settings.publiclyAvailable} notify={notify} onRegenerate={save} />
          <Panel title="Terms">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-muted">Term length</dt>
                <dd className="mt-0.5 text-marble">{periodInfo(fund.fundDisbursementPeriod).label}</dd>
              </div>
              <div>
                <dt className="text-muted">Fees ({fund.disbursementType})</dt>
                <dd className="mt-0.5 text-marble">{feeSentence(fund.disbursementType)}</dd>
              </div>
              <div>
                <dt className="text-muted">{term.stage === "recruiting" ? "Recruiting ends" : "Recruiting ended"}</dt>
                <dd className="mt-0.5 text-marble">{fund.recruitEnd ? formatDate(fund.recruitEnd * 1000) : "Not set"}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
              Terms are fixed when the fund is created so members know what they signed up for.
            </p>
          </Panel>
        </div>
      </div>
      {toast}
    </div>
  );
}

function ProfilePanel({ fund, description, onSave }) {
  const [draft, setDraft] = useState(description);
  const [busy, setBusy] = useState(false);
  const trimmed = draft.trim();
  const error = trimmed.length < 10 ? "Use at least 10 characters." : null;
  const dirty = trimmed !== description.trim();

  async function submit(e) {
    e.preventDefault();
    if (error || !dirty) return;
    setBusy(true);
    const saved = await onSave({ description: trimmed }, "Description updated.");
    setBusy(false);
    if (saved) setDraft(saved.description);
  }

  return (
    <Panel title="Profile">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 border-b border-line pb-4 sm:grid-cols-[1fr_160px]">
          <div>
            <span className="field-label">Fund name</span>
            <div className="font-display text-xl text-marble">{fund.fundName}</div>
          </div>
          <div>
            <span className="field-label">Symbol</span>
            <div className="text-sm font-semibold tracking-wide text-marble">{fund.fundSymbol}</div>
          </div>
        </div>
        <div>
          <label htmlFor="fund-description" className="field-label">Description</label>
          <textarea id="fund-description" className={`field min-h-[110px] resize-y ${dirty && error ? "border-loss" : ""}`}
            value={draft} maxLength={1000} onChange={(e) => setDraft(e.target.value)}
            aria-describedby="fund-description-msg" aria-invalid={Boolean(dirty && error)} />
          <p id="fund-description-msg" className={`mt-1.5 text-xs ${dirty && error ? "text-loss" : "text-muted"}`}>
            {dirty && error ? error : `Shown on the public fund page. ${trimmed.length}/1,000`}
          </p>
        </div>
        <p className="text-xs text-muted">The name and symbol can&apos;t be changed after the fund is created.</p>
        <div className="flex justify-end gap-2">
          {dirty ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(description)}>Discard</button>
          ) : null}
          <button type="submit" className="btn btn-primary btn-sm" disabled={!dirty || Boolean(error) || busy}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : null}
            Save description
          </button>
        </div>
      </form>
    </Panel>
  );
}

function VisibilityPanel({ isPublic, onChange }) {
  const [busy, setBusy] = useState(false);
  return (
    <Panel title="Visibility">
      <div className="flex items-start justify-between gap-4">
        <div>
          <label htmlFor="fund-visibility" className="text-sm font-medium text-marble">
            {isPublic ? "Public" : "Private"}
          </label>
          <p className="mt-1 text-sm text-muted">
            {isPublic
              ? "Anyone can view the fund page and request to join."
              : "Only people with the access code can request to join."}
          </p>
        </div>
        {busy ? <span className="loading loading-spinner loading-sm text-bronze" /> : (
          <input id="fund-visibility" type="checkbox" className="toggle toggle-primary" checked={isPublic}
            onChange={async (e) => { setBusy(true); await onChange(e.target.checked); setBusy(false); }} />
        )}
      </div>
    </Panel>
  );
}

function AccessCodePanel({ fundID, isPublic, notify, onRegenerate }) {
  const { responseJSON, isLoading, reload } = useFetch(`/api/fund/settings?id=${encodeURIComponent(fundID)}`);
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const code = responseJSON?.data?.accessCode;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      notify("Access code copied.");
    } catch (e) {
      setRevealed(true);
      notify("Couldn't copy automatically. The code is shown so you can copy it.", "error");
    }
  }

  async function regenerate() {
    setBusy(true);
    const saved = await onRegenerate({ regenerateAccessCode: true }, "New access code generated. The old one no longer works.");
    setBusy(false);
    setConfirming(false);
    if (saved) {
      setRevealed(true);
      reload();
    }
  }

  return (
    <Panel title="Access code">
      <p className="mb-4 text-sm text-muted">
        {isPublic
          ? "Not required while the fund is public. Share it if you switch to private."
          : "Share this code with people you want to invite."}
      </p>
      {isLoading ? <Skeleton className="h-12 w-full" /> : (
        <div className="flex items-center justify-between gap-3 rounded-btn border border-line bg-basalt px-4 py-3">
          <span className="tabular text-2xl font-semibold tracking-[0.3em] text-marble" aria-live="polite">
            {revealed ? code : "••••••"}
          </span>
          <div className="flex gap-1">
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setRevealed((r) => !r)}>
              {revealed ? "Hide" : "Show"}
            </button>
            <button type="button" className="btn btn-ghost btn-xs" onClick={copy} disabled={!code}>Copy</button>
          </div>
        </div>
      )}
      <div className="mt-4">
        {confirming ? (
          <div className="rounded-btn border border-line p-3 text-sm">
            <p className="text-marble">Generate a new code? The current code stops working.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn btn-primary btn-xs" onClick={regenerate} disabled={busy}>
                {busy ? <span className="loading loading-spinner loading-xs" /> : null}
                Generate new code
              </button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setConfirming(false)}>Keep current code</button>
            </div>
          </div>
        ) : (
          <button type="button" className="text-sm text-muted hover:text-bronze" onClick={() => setConfirming(true)}>
            Generate a new code
          </button>
        )}
      </div>
    </Panel>
  );
}
