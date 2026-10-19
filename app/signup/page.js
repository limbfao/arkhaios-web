"use client";

import Link from "next/link";
import React, { useState } from "react";
import AuthShell from "../public-ui/AuthShell";
import {
  Field,
  PasswordField,
  SubmitButton,
  FormAlert,
  PasswordChecklist,
  passwordIsValid,
} from "../public-ui/form";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values) {
  const errors = {};
  if (!values.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!values.lastName.trim()) errors.lastName = "Enter your last name.";
  if (!values.email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (!passwordIsValid(values.password)) errors.password = "Your password doesn't meet the requirements yet.";
  if (!values.confirm) errors.confirm = "Re-enter your password.";
  else if (values.confirm !== values.password) errors.confirm = "Passwords don't match.";
  if (!values.agree) errors.agree = "You need to accept the terms to open an account.";
  return errors;
}

export default function Page() {
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
    agree: false,
  });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverFieldErrors, setServerFieldErrors] = useState({});

  const errors = { ...validate(values), ...serverFieldErrors };
  // Show a field's error once the person has left it, or after they try to submit
  const show = (name) => (submitted || touched[name] ? errors[name] : undefined);

  function update(name) {
    return (e) => {
      const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setValues((v) => ({ ...v, [name]: value }));
      if (serverFieldErrors[name]) setServerFieldErrors((s) => ({ ...s, [name]: undefined }));
    };
  }
  const blur = (name) => () => setTouched((t) => ({ ...t, [name]: true }));

  async function register(event) {
    event.preventDefault();
    if (loading) return;
    setSubmitted(true);
    setServerError("");

    const current = validate(values);
    if (Object.keys(current).length) {
      const first = Object.keys(current)[0];
      document.getElementById(first)?.focus();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          password: values.password,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (data.status === "success") {
        window.location.href = "/signup/verify";
        return;
      }

      if (data.message === "email is already in use") {
        setServerFieldErrors({ email: "An account with this email already exists. Sign in instead?" });
        document.getElementById("email")?.focus();
      } else if (response.status === 400 && data.message) {
        setServerError(data.message.charAt(0).toUpperCase() + data.message.slice(1) + ".");
      } else {
        setServerError("We couldn't create your account right now. Please try again in a moment.");
      }
    } catch (e) {
      setServerError("Can't reach Arkhaios. Check your connection and try again.");
    }
    setLoading(false);
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Trade stocks and crypto, and start or join a fund with people you know."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-bronze hover:text-bronze-light">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={register} noValidate className="space-y-5">
        <FormAlert>{serverError}</FormAlert>

        <div className="grid grid-cols-2 gap-3">
          <Field
            id="firstName"
            label="First name"
            autoComplete="given-name"
            autoFocus
            maxLength={50}
            value={values.firstName}
            onChange={update("firstName")}
            onBlur={blur("firstName")}
            error={show("firstName")}
          />
          <Field
            id="lastName"
            label="Last name"
            autoComplete="family-name"
            maxLength={50}
            value={values.lastName}
            onChange={update("lastName")}
            onBlur={blur("lastName")}
            error={show("lastName")}
          />
        </div>

        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={update("email")}
          onBlur={blur("email")}
          error={show("email")}
          hint="We'll send a 6-digit code to confirm it."
        />

        <div>
          <PasswordField
            id="password"
            label="Password"
            autoComplete="new-password"
            value={values.password}
            onChange={update("password")}
            onBlur={blur("password")}
            aria-describedby="password-rules"
          />
          <div id="password-rules">
            <PasswordChecklist
              password={values.password}
              showErrors={submitted || (touched.password && values.password.length > 0)}
            />
          </div>
        </div>

        <PasswordField
          id="confirm"
          label="Confirm password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={update("confirm")}
          onBlur={blur("confirm")}
          error={show("confirm")}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
            <input
              id="agree"
              type="checkbox"
              className="checkbox checkbox-primary checkbox-sm mt-0.5"
              checked={values.agree}
              onChange={update("agree")}
            />
            <span>
              I agree to the{" "}
              <Link href="/legal/terms" className="text-marble underline-offset-2 hover:underline">Terms of use</Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="text-marble underline-offset-2 hover:underline">Privacy policy</Link>.
            </span>
          </label>
          {show("agree") && <p className="mt-1.5 text-xs text-loss">{errors.agree}</p>}
        </div>

        <SubmitButton loading={loading} loadingLabel="Creating account">Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
