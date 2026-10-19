"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import UserContext from "../UserContext";
import { Badge, Card, Spinner, fetchJSON } from "./accountUi";

function CodeInput({ value, onChange, id }) {
  return (
    <input
      id={id}
      className="field tabular w-40 text-center text-lg tracking-[0.3em]"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="000000"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      required
    />
  );
}

// Turn TOTP two-factor authentication on or off (api/mfa.js)
export default function EnableMFA() {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const [enabled, setEnabled] = useState(Boolean(user.mfaVerified));
  const [qrCode, setQrCode] = useState(null);
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startSetup() {
    setBusy(true); setError("");
    try {
      const { data } = await fetchJSON("/api/mfa", { method: "POST", body: {} });
      setQrCode(data.token);
    } catch (e) {
      setError("Setup couldn't be started. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e, disable) {
    e.preventDefault();
    if (code.length !== 6) return setError("Enter the 6-digit code from your authenticator app.");
    setBusy(true); setError("");
    try {
      await fetchJSON("/api/mfa", { method: "POST", body: disable ? { code, disable: true } : { code } });
      setEnabled(!disable);
      setQrCode(null); setDisabling(false); setCode("");
      router.refresh();
    } catch (err) {
      setError(err.message === "Invalid code" ? "That code didn't match. Codes change every 30 seconds, so try the newest one." : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Two-factor authentication"
      description="Protect your account with a 6-digit code from an authenticator app"
      actions={enabled ? <Badge tone="gain">On</Badge> : <Badge>Off</Badge>}
    >
      {enabled ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            You'll be asked for a code from your authenticator app when you sign in.
          </p>
          {!disabling ? (
            <button className="btn btn-ghost btn-sm border border-line" onClick={() => { setDisabling(true); setError(""); }}>
              Turn off two-factor authentication
            </button>
          ) : (
            <form onSubmit={(e) => submit(e, true)} className="space-y-3 rounded-btn border border-line bg-basalt/50 p-4">
              <label htmlFor="mfa-disable-code" className="field-label">Enter a current code to confirm</label>
              <div className="flex flex-wrap items-center gap-3">
                <CodeInput id="mfa-disable-code" value={code} onChange={setCode} />
                <button type="submit" className="btn btn-sm border-loss/40 bg-loss/15 text-loss hover:bg-loss/25" disabled={busy}>
                  {busy ? <Spinner /> : null} Turn off
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDisabling(false); setCode(""); setError(""); }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : !qrCode ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-btn bg-slate text-bronze">
            <DevicePhoneMobileIcon className="h-5 w-5" />
          </span>
          <p className="min-w-0 flex-1 text-sm text-muted">
            Use Google Authenticator, 1Password, Authy or any app that supports time-based codes.
          </p>
          <button className="btn btn-primary btn-sm" onClick={startSetup} disabled={busy}>
            {busy ? <Spinner /> : null} Set up two-factor authentication
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => submit(e, false)} className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="rounded-btn bg-marble p-2">
            <img src={qrCode} alt="QR code to scan with your authenticator app" className="h-44 w-44" />
          </div>
          <ol className="space-y-5 text-sm">
            <li>
              <p className="font-medium text-marble">1. Scan the QR code</p>
              <p className="mt-1 text-muted">Open your authenticator app, add an account and scan this code.</p>
            </li>
            <li>
              <label htmlFor="mfa-code" className="font-medium text-marble">2. Enter the 6-digit code</label>
              <p className="mb-3 mt-1 text-muted">The app shows a new code every 30 seconds.</p>
              <div className="flex flex-wrap items-center gap-3">
                <CodeInput id="mfa-code" value={code} onChange={setCode} />
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || code.length !== 6}>
                  {busy ? <Spinner /> : null} Verify and turn on
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQrCode(null); setCode(""); setError(""); }}>
                  Cancel
                </button>
              </div>
            </li>
          </ol>
        </form>
      )}
      {error ? <p className="mt-4 text-sm text-loss" role="alert">{error}</p> : null}
    </Card>
  );
}
