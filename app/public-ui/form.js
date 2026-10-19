"use client";
import { useState } from "react";

// Small form kit for the signed-out pages (sign in, sign up, verify, recovery).

export function Field({ id, label, error, hint, aside, className = "", inputClassName = "", ...props }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field-label">{label}</label>
        {aside}
      </div>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`field ${error ? "border-loss/70 focus:border-loss" : ""} ${inputClassName}`}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-loss">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Field type={visible ? "text" : "password"} inputClassName="pr-16" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-[30px] rounded px-2 py-1.5 text-xs text-muted hover:text-marble"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SubmitButton({ loading, loadingLabel, children, className = "", ...props }) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      aria-busy={loading ? true : undefined}
      className={`btn btn-primary w-full disabled:bg-bronze/60 disabled:text-basalt ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingLabel || children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Inline message box above a form: tone is "error", "success" or "info"
export function FormAlert({ tone = "error", children }) {
  if (!children) return null;
  const styles = {
    error: "border-loss/40 bg-loss/10 text-marble",
    success: "border-gain/40 bg-gain/10 text-marble",
    info: "border-line bg-stone text-muted",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-btn border px-3.5 py-2.5 text-sm ${styles[tone]}`}>
      {children}
    </div>
  );
}

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "letter", label: "A letter", test: (p) => /[A-Za-z]/.test(p) },
  { id: "number", label: "A number", test: (p) => /[0-9]/.test(p) },
];

export function passwordIsValid(password) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function PasswordChecklist({ password, showErrors }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        const tone = ok ? "text-gain" : showErrors ? "text-loss" : "text-muted";
        return (
          <li key={rule.id} className={`flex items-center gap-1.5 ${tone}`}>
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
              {ok ? (
                <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <circle cx="8" cy="8" r="2.5" fill="currentColor" />
              )}
            </svg>
            {rule.label}
            <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

// Six single-digit boxes that behave like one input (typing, backspace, paste)
export function CodeInput({ value, onChange, disabled, invalid, autoFocus, idPrefix = "code" }) {
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  function focusBox(i) {
    const el = document.getElementById(`${idPrefix}-${i}`);
    if (el) { el.focus(); el.select(); }
  }

  function handleChange(i, raw) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      const next = digits.slice(); next[i] = "";
      onChange(next.join(""));
      return;
    }
    // Typing or pasting several digits fills forward from this box
    const next = digits.slice();
    for (let k = 0; k < clean.length && i + k < 6; k++) next[i + k] = clean[k];
    onChange(next.join("").slice(0, 6));
    focusBox(Math.min(i + clean.length, 5));
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = digits.slice(); next[i - 1] = "";
      onChange(next.join(""));
      focusBox(i - 1);
    } else if (e.key === "ArrowLeft" && i > 0) {
      focusBox(i - 1);
    } else if (e.key === "ArrowRight" && i < 5) {
      focusBox(i + 1);
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
      focusBox(Math.min(pasted.length, 5));
    }
  }

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1} of 6`}
          className={`tabular h-14 w-full min-w-0 rounded-btn border bg-basalt text-center text-2xl text-marble transition-colors focus:outline-none ${
            invalid ? "border-loss/70 focus:border-loss" : "border-line focus:border-bronze"
          }`}
        />
      ))}
    </div>
  );
}
