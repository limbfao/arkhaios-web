"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner, fetchJSON } from "../accountUi";
import { BankMark } from "./bankMark";

// Demo mode stand-in for Plaid Link: pick a sample bank and account type
export default function LinkBankModal({ open, onClose, institutions, onLinked }) {
  const dialog = useRef(null);
  const [institution, setInstitution] = useState(null);
  const [subtype, setSubtype] = useState("checking");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      setInstitution(null); setSubtype("checking"); setError("");
      el.showModal();
    } else if (!open && el.open) el.close();
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    if (!institution) return;
    setSaving(true); setError("");
    try {
      const { data } = await fetchJSON("/api/plaid/demo-link", {
        method: "POST",
        body: { institution_id: institution, subtype },
      });
      onLinked(data);
    } catch (err) {
      setError("The account couldn't be linked. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} className="modal" onClose={onClose} aria-labelledby="link-bank-title">
      <form onSubmit={submit} className="modal-box max-w-md border border-line bg-stone p-0">
        <div className="border-b border-line px-6 py-5">
          <h2 id="link-bank-title" className="text-lg font-semibold text-marble">Link a bank account</h2>
          <p className="mt-1 text-sm text-muted">Demo mode: choose a sample bank. No real connection is made.</p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <fieldset>
            <legend className="field-label">Bank</legend>
            <div className="space-y-2">
              {institutions.map((inst) => (
                <label
                  key={inst.institution_id}
                  className={`flex cursor-pointer items-center gap-3 rounded-btn border px-3.5 py-2.5 transition-colors ${
                    institution === inst.institution_id ? "border-bronze bg-bronze/10" : "border-line hover:bg-slate"
                  }`}
                >
                  <input
                    type="radio"
                    name="institution"
                    className="radio radio-primary radio-sm"
                    checked={institution === inst.institution_id}
                    onChange={() => setInstitution(inst.institution_id)}
                  />
                  <BankMark name={inst.institution_name} />
                  <span className="text-sm text-marble">{inst.institution_name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="field-label">Account type</legend>
            <div className="join w-full">
              {["checking", "savings"].map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={subtype === type}
                  onClick={() => setSubtype(type)}
                  className={`btn join-item btn-sm flex-1 ${subtype === type ? "btn-active border-bronze/60 text-marble" : "btn-ghost border-line text-muted"}`}
                >
                  {type === "checking" ? "Checking" : "Savings"}
                </button>
              ))}
            </div>
          </fieldset>

          {error ? <p className="text-sm text-loss" role="alert">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!institution || saving}>
            {saving ? <Spinner /> : null}
            Link account
          </button>
        </div>
      </form>
      <form method="dialog" className="modal-backdrop"><button aria-label="Close">close</button></form>
    </dialog>
  );
}
