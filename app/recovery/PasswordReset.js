"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthShell from "../public-ui/AuthShell";
import {
  Field,
  PasswordField,
  SubmitButton,
  FormAlert,
  CodeInput,
  PasswordChecklist,
  passwordIsValid,
  Spinner,
} from "../public-ui/form";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN = 30;

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

// Forgot password: email -> 6-digit code -> new password -> done
export default function PasswordReset({ demoMode }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function fail(e) {
    setError(e?.message || "Can't reach Arkhaios. Check your connection and try again.");
    setLoading(false);
  }

  async function sendCode(event) {
    event.preventDefault();
    if (loading) return;
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFieldError(email.trim() ? "Enter a valid email address." : "Enter your email address.");
      return;
    }
    setFieldError("");
    setError("");
    setLoading(true);
    try {
      const { data } = await post("/api/account/send-recovery-code", { email: email.trim() });
      if (data.status !== "success") throw new Error("We couldn't send a code right now. Please try again in a moment.");
      setStep("code");
      setCooldown(RESEND_COOLDOWN);
      setLoading(false);
    } catch (e) {
      fail(e);
    }
  }

  async function resend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError("");
    setNotice("");
    try {
      const { data } = await post("/api/account/send-recovery-code", { email: email.trim() });
      if (data.status !== "success") throw new Error("We couldn't send a new code. Please try again shortly.");
      setNotice("We sent a new code. Earlier codes no longer work.");
      setCode("");
      setCooldown(RESEND_COOLDOWN);
    } catch (e) {
      setError(e.message);
    }
    setResending(false);
  }

  async function checkCode(event) {
    event?.preventDefault();
    if (loading) return;
    if (code.length !== 6) {
      setError("Enter all 6 digits of the code.");
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const { response, data } = await post("/api/account/check-recovery-code", { email: email.trim(), recoveryCode: code });
      if (data.status === "success") {
        setStep("password");
        setLoading(false);
        return;
      }
      if (response.status === 401) {
        setError("That code isn't right or has expired. Check the email, or send a new code.");
        setCode("");
        setLoading(false);
        document.getElementById("code-0")?.focus();
        return;
      }
      throw new Error("We couldn't check that code right now. Please try again in a moment.");
    } catch (e) {
      fail(e);
    }
  }

  useEffect(() => {
    if (step === "code" && code.length === 6 && !loading) checkCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function resetPassword(event) {
    event.preventDefault();
    if (loading) return;
    setSubmitted(true);
    if (!passwordIsValid(password) || password !== confirm) return;
    setError("");
    setLoading(true);
    try {
      const { response, data } = await post("/api/account/reset-password", {
        email: email.trim(),
        recoveryCode: code,
        password,
      });
      if (data.status === "success") {
        setStep("done");
        setLoading(false);
        return;
      }
      if (response.status === 401) {
        // Code expired between steps: send them back to request a new one
        setStep("code");
        setCode("");
        setError("Your code expired before the password was saved. Send a new code to continue.");
        setLoading(false);
        return;
      }
      throw new Error("We couldn't reset your password right now. Please try again in a moment.");
    } catch (e) {
      fail(e);
    }
  }

  const backToSignIn = (
    <>
      Remembered it?{" "}
      <Link href="/login" className="font-medium text-bronze hover:text-bronze-light">
        Back to sign in
      </Link>
    </>
  );

  if (step === "email") {
    return (
      <AuthShell
        title="Reset your password"
        subtitle="Enter the email you signed up with and we'll send you a 6-digit code."
        footer={backToSignIn}
      >
        <form onSubmit={sendCode} noValidate className="space-y-5">
          <FormAlert>{error}</FormAlert>
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldError(""); }}
            error={fieldError}
          />
          <SubmitButton loading={loading} loadingLabel="Sending code">Send code</SubmitButton>
        </form>
      </AuthShell>
    );
  }

  if (step === "code") {
    return (
      <AuthShell
        title="Enter your code"
        subtitle={
          <>
            If an account exists for <span className="text-marble">{email.trim()}</span>, we sent it a 6-digit code.
            It expires in 20 minutes.
          </>
        }
        footer={backToSignIn}
      >
        <form onSubmit={checkCode} noValidate className="space-y-5">
          <FormAlert>{error}</FormAlert>
          <FormAlert tone="success">{notice}</FormAlert>
          <fieldset>
            <legend className="field-label">Recovery code</legend>
            <CodeInput value={code} onChange={(v) => { setCode(v); setError(""); }} disabled={loading} invalid={!!error} autoFocus />
          </fieldset>
          <SubmitButton loading={loading} loadingLabel="Checking">Continue</SubmitButton>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <button
              type="button"
              onClick={() => { setStep("email"); setCode(""); setError(""); setNotice(""); }}
              className="hover:text-marble"
            >
              Use a different email
            </button>
            {cooldown > 0 ? (
              <span className="tabular">Send a new code in {cooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={resend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 font-medium text-bronze hover:text-bronze-light disabled:text-muted"
              >
                {resending && <Spinner className="h-3.5 w-3.5" />}
                Send a new code
              </button>
            )}
          </div>
          {demoMode && (
            <p className="rounded-btn border border-dashed border-line px-3.5 py-3 text-xs text-muted">
              <span className="font-medium text-marble">Demo mode.</span> No email is sent; the code is printed in the server log.
            </p>
          )}
        </form>
      </AuthShell>
    );
  }

  if (step === "password") {
    const mismatch = submitted && confirm !== password ? "Passwords don't match." : undefined;
    return (
      <AuthShell
        title="Choose a new password"
        subtitle="You'll be signed out everywhere else once it's saved."
        footer={backToSignIn}
      >
        <form onSubmit={resetPassword} noValidate className="space-y-5">
          <FormAlert>{error}</FormAlert>
          <div>
            <PasswordField
              id="newPassword"
              label="New password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordChecklist password={password} showErrors={submitted} />
          </div>
          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch}
          />
          <SubmitButton loading={loading} loadingLabel="Saving">Save new password</SubmitButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Password updated" subtitle="Your new password is saved. Use it to sign in.">
      <Link href="/login" className="btn btn-primary w-full">
        Sign in
      </Link>
    </AuthShell>
  );
}
