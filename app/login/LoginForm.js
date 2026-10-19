"use client";
import Link from "next/link";
import { useState } from "react";
import AuthShell from "../public-ui/AuthShell";
import { Field, PasswordField, SubmitButton, FormAlert } from "../public-ui/form";

const DEMO_EMAIL = "demo@arkhaios.test";
const DEMO_PASSWORD = "demo1234";

export default function LoginForm({ demoMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfa, setMfa] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  async function submit(event) {
    event.preventDefault();
    if (loading) return;

    const errors = {};
    if (!mfaRequired) {
      if (!email.trim()) errors.email = "Enter your email address.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Enter a valid email address.";
      if (!password) errors.password = "Enter your password.";
    } else if (!/^\d{6}$/.test(mfa.trim())) {
      errors.mfa = "Enter the 6-digit code from your authenticator app.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    setError("");

    const payload = { email: email.trim(), password, remember };
    if (mfaRequired) payload.mfa = mfa.trim();

    try {
      const response = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (data.status === "success") {
        // Keep the spinner up while the app loads
        window.location.href = "/home";
        return;
      }

      if (data?.data?.mfa) {
        setMfaRequired(true);
      } else if (data.message === "invalid mfa code") {
        setFieldErrors({ mfa: "That code didn't work. Codes refresh every 30 seconds; try the current one." });
      } else if (response.status === 401) {
        setError("The email or password is incorrect.");
      } else if (response.status === 403) {
        // A valid session already exists in this browser
        window.location.href = "/home";
        return;
      } else {
        setError("We couldn't sign you in right now. Please try again in a moment.");
      }
    } catch (e) {
      setError("Can't reach Arkhaios. Check your connection and try again.");
    }
    setLoading(false);
  }

  function useDemoAccount() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setFieldErrors({});
    setError("");
  }

  if (mfaRequired) {
    return (
      <AuthShell
        title="Two-step verification"
        subtitle="Enter the 6-digit code from your authenticator app to finish signing in."
        footer={
          <button
            type="button"
            className="text-muted hover:text-marble"
            onClick={() => { setMfaRequired(false); setMfa(""); setFieldErrors({}); }}
          >
            Use a different account
          </button>
        }
      >
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field
            id="mfa"
            label="Authentication code"
            value={mfa}
            onChange={(e) => setMfa(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            error={fieldErrors.mfa}
            inputClassName="tabular tracking-[0.3em]"
          />
          <SubmitButton loading={loading} loadingLabel="Verifying">Verify and sign in</SubmitButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Arkhaios account."
      footer={
        <>
          New to Arkhaios?{" "}
          <Link href="/signup" className="font-medium text-bronze hover:text-bronze-light">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <FormAlert>{error}</FormAlert>

        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />

        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          aside={
            <Link href="/recovery" className="mb-1.5 text-sm text-muted hover:text-marble">
              Forgot password?
            </Link>
          }
        />

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            className="checkbox checkbox-primary checkbox-sm"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Keep me signed in for 30 days
        </label>

        <SubmitButton loading={loading} loadingLabel="Signing in">Sign in</SubmitButton>

        {demoMode && (
          <div className="rounded-btn border border-dashed border-line px-3.5 py-3 text-xs text-muted">
            <span className="font-medium text-marble">Demo mode.</span> Sign in as{" "}
            <span className="tabular text-marble">{DEMO_EMAIL}</span> with password{" "}
            <span className="tabular text-marble">{DEMO_PASSWORD}</span>.{" "}
            <button type="button" onClick={useDemoAccount} className="text-bronze hover:text-bronze-light">
              Fill in
            </button>
          </div>
        )}
      </form>
    </AuthShell>
  );
}
