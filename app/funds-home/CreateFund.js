"use client";

// Create-a-fund form, shown on /dashboard and /funds-home to users who don't manage a fund yet

import { useState } from "react";
import { FEE_TYPES, PERIODS, feeSentence, periodInfo, postJSON } from "./fundKit";

const EMPTY = { name: "", symbol: "", description: "", period: "quarterly", fee: "2/20", isPublic: true };

function validate(v) {
  const e = {};
  if (v.name.trim().length < 2) e.name = "Use at least 2 characters.";
  else if (v.name.trim().length > 60) e.name = "Keep the name under 60 characters.";
  if (!/^[A-Z]{2,8}$/.test(v.symbol)) e.symbol = "Use 2 to 8 uppercase letters, e.g. ARKG.";
  if (v.description.trim().length < 10) e.description = "Describe the strategy in at least 10 characters.";
  else if (v.description.trim().length > 1000) e.description = "Keep the description under 1,000 characters.";
  if (!PERIODS.some((p) => p.value === v.period)) e.period = "Choose a term length.";
  if (!FEE_TYPES.some((f) => f.value === v.fee)) e.fee = "Choose a fee structure.";
  return e;
}

export default function CreateFund() {
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [created, setCreated] = useState(null);

  const errors = validate(values);
  const show = (key) => (submitted || touched[key]) && errors[key];
  const set = (key) => (e) => {
    const raw = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [key]: key === "symbol" ? raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8) : raw }));
  };
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  async function submit(event) {
    event.preventDefault();
    setSubmitted(true);
    setServerError("");
    if (Object.keys(errors).length) return;

    setBusy(true);
    const result = await postJSON("/api/fund/create", {
      name: values.name.trim(),
      symbol: values.symbol,
      description: values.description.trim(),
      disbursementPeriod: values.period,
      disbursementType: values.fee,
      public: values.isPublic,
    });
    setBusy(false);

    if (result.ok) {
      setCreated(values);
      // The console reads the new fund from the server
      setTimeout(() => window.location.reload(), 900);
    } else {
      setServerError(result.message || "The fund couldn't be created. Try again.");
    }
  }

  if (created) {
    return (
      <div className="panel p-8 text-center" role="status">
        <h2 className="font-display text-2xl text-marble">{created.name} is live</h2>
        <p className="mt-2 text-sm text-muted">Opening your fund console…</p>
        <span className="loading loading-spinner loading-sm mt-4 text-bronze" />
      </div>
    );
  }

  const fee = FEE_TYPES.find((f) => f.value === values.fee);

  return (
    <form onSubmit={submit} noValidate className="panel">
      <div className="border-b border-line px-6 py-5">
        <h2 className="text-lg font-semibold text-marble">Fund details</h2>
        <p className="mt-1 text-sm text-muted">
          You become the fund&apos;s portfolio manager. It opens for deposits for 14 days, then trading begins.
        </p>
      </div>

      <div className="grid gap-5 px-6 py-6 md:grid-cols-[1fr_180px]">
        <Field id="fund-name" label="Fund name" error={show("name")}>
          <input id="fund-name" className={fieldClass(show("name"))} value={values.name} onChange={set("name")}
            onBlur={blur("name")} placeholder="e.g. Arkhaios Growth" maxLength={60}
            aria-invalid={Boolean(show("name"))} aria-describedby="fund-name-msg" />
        </Field>
        <Field id="fund-symbol" label="Symbol" error={show("symbol")} hint="2 to 8 letters">
          <input id="fund-symbol" className={`${fieldClass(show("symbol"))} font-semibold tracking-wide`}
            value={values.symbol} onChange={set("symbol")} onBlur={blur("symbol")} placeholder="ARKG"
            autoCapitalize="characters" aria-invalid={Boolean(show("symbol"))} aria-describedby="fund-symbol-msg" />
        </Field>

        <div className="md:col-span-2">
          <Field id="fund-description" label="Strategy" error={show("description")}
            hint={`${values.description.trim().length}/1,000`}>
            <textarea id="fund-description" className={`${fieldClass(show("description"))} min-h-[110px] resize-y`}
              value={values.description} onChange={set("description")} onBlur={blur("description")}
              placeholder="What the fund invests in, how concentrated it is, and how often you rebalance."
              maxLength={1000} aria-invalid={Boolean(show("description"))} aria-describedby="fund-description-msg" />
          </Field>
        </div>

        <Field id="fund-period" label="Term length" error={show("period")} hint={periodInfo(values.period).hint}>
          <select id="fund-period" className="select select-bordered w-full border-line bg-basalt text-sm focus:border-bronze focus:outline-none"
            value={values.period} onChange={set("period")} aria-describedby="fund-period-msg">
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <div className="hidden md:block" />

        <fieldset className="md:col-span-2">
          <legend className="field-label">Fee structure</legend>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
            {FEE_TYPES.map((f) => {
              const active = values.fee === f.value;
              return (
                <label key={f.value}
                  className={`cursor-pointer rounded-box border p-4 transition-colors ${
                    active ? "border-bronze bg-bronze/10" : "border-line bg-basalt hover:border-muted/60"
                  }`}>
                  <input type="radio" name="fee" value={f.value} checked={active} onChange={set("fee")} className="sr-only" />
                  <div className={`text-lg font-semibold ${active ? "text-bronze" : "text-marble"}`}>{f.value}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted">
                    {f.base}% base fee, {f.performance}% of profits above a {f.hurdle}% return
                  </div>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">{fee ? feeSentence(fee.value) : null} Fees are charged at the end of each term.</p>
        </fieldset>

        <div className="md:col-span-2 flex items-start justify-between gap-6 rounded-box border border-line bg-basalt p-4">
          <div>
            <label htmlFor="fund-public" className="text-sm font-medium text-marble">Public fund</label>
            <p className="mt-0.5 text-xs text-muted">
              {values.isPublic
                ? "Anyone can find the fund and request to join."
                : "People need the 6-digit access code to request to join. You'll find it in fund settings."}
            </p>
          </div>
          <input id="fund-public" type="checkbox" className="toggle toggle-primary" checked={values.isPublic}
            onChange={set("isPublic")} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
        <p className="text-sm text-loss" role="alert">{serverError}</p>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : null}
          Create fund
        </button>
      </div>
    </form>
  );
}

function fieldClass(error) {
  return `field ${error ? "border-loss focus:border-loss" : ""}`;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
      <p id={`${id}-msg`} className={`mt-1.5 min-h-[1rem] text-xs ${error ? "text-loss" : "text-muted"}`}>
        {error || hint || ""}
      </p>
    </div>
  );
}
