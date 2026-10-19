"use client";

import { useEffect, useState } from "react";
import AuthShell from "../../public-ui/AuthShell";
import { CodeInput, SubmitButton, FormAlert, Spinner } from "../../public-ui/form";

const RESEND_COOLDOWN = 30;

export default function VerifyForm({ email, demoMode }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function verify(event) {
    event?.preventDefault();
    if (loading) return;
    if (code.length !== 6) {
      setError("Enter all 6 digits of the code.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationCode: code }),
      });
      const data = await response.json().catch(() => ({}));
      if (data.status === "success") {
        window.location.href = "/home";
        return;
      }
      if (data.message === "verification code has expired") {
        setError("That code has expired. Send a new one and try again.");
      } else if (data.message === "email has already been verified") {
        window.location.href = "/home";
        return;
      } else if (response.status === 403) {
        setError("Your session has ended. Sign in again to finish verifying.");
      } else {
        setError("That code isn't right. Check the email and try again.");
      }
      setCode("");
      document.getElementById("code-0")?.focus();
    } catch (e) {
      setError("Can't reach Arkhaios. Check your connection and try again.");
    }
    setLoading(false);
  }

  // Submit automatically once the sixth digit is entered
  useEffect(() => {
    if (code.length === 6 && !loading) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function resend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resend: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (data.status === "success") {
        setNotice(`We sent a new code${email ? ` to ${email}` : ""}. Earlier codes no longer work.`);
        setCode("");
        setCooldown(RESEND_COOLDOWN);
      } else {
        setError("We couldn't send a new code. Please try again shortly.");
      }
    } catch (e) {
      setError("Can't reach Arkhaios. Check your connection and try again.");
    }
    setResending(false);
  }

  async function startOver() {
    try {
      await fetch("/api/account/logout", { method: "POST" });
    } catch (e) {}
    window.location.href = "/signup";
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        email ? (
          <>
            We sent a 6-digit code to <span className="text-marble">{email}</span>. It expires in 20 minutes.
          </>
        ) : (
          "We sent a 6-digit code to your email. It expires in 20 minutes."
        )
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>Wrong email address?</span>
          <button type="button" onClick={startOver} className="font-medium text-bronze hover:text-bronze-light">
            Sign out and start over
          </button>
        </div>
      }
    >
      <form onSubmit={verify} noValidate className="space-y-5">
        <FormAlert>{error}</FormAlert>
        <FormAlert tone="success">{notice}</FormAlert>

        <fieldset>
          <legend className="field-label">Verification code</legend>
          <CodeInput value={code} onChange={(v) => { setCode(v); setError(""); }} disabled={loading} invalid={!!error} autoFocus />
        </fieldset>

        <SubmitButton loading={loading} loadingLabel="Verifying">Verify email</SubmitButton>

        <p className="text-sm text-muted">
          Didn&apos;t get it? Check your spam folder, or{" "}
          {cooldown > 0 ? (
            <span className="tabular">send a new code in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 font-medium text-bronze hover:text-bronze-light disabled:text-muted"
            >
              {resending && <Spinner className="h-3.5 w-3.5" />}
              send a new code
            </button>
          )}
          .
        </p>

        {demoMode && (
          <p className="rounded-btn border border-dashed border-line px-3.5 py-3 text-xs text-muted">
            <span className="font-medium text-marble">Demo mode.</span> No email is sent; the code is printed in the server log.
          </p>
        )}
      </form>
    </AuthShell>
  );
}
