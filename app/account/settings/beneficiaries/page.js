"use client";

import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Avatar, Card, Spinner, Toast, fetchJSON, useToast } from "../../accountUi";
import { EmptyState, ErrorState, SkeletonRows } from "../../../components/ui";

const RELATIONSHIPS = [
  ["spouse", "Spouse or partner"], ["child", "Child"], ["parent", "Parent"], ["sibling", "Sibling"], ["other", "Other"],
];
const relationshipLabel = (r) => (RELATIONSHIPS.find(([v]) => v === r) || [r, r])[1];

export default function Page() {
  const [state, setState] = useState({ loading: true, error: false, list: [] });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", relationship: "", share: "" });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [toast, showToast] = useToast();

  async function load() {
    setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const { data } = await fetchJSON("/api/account/beneficiaries");
      setState({ loading: false, error: false, list: data || [] });
    } catch (e) {
      setState({ loading: false, error: true, list: [] });
    }
  }
  useEffect(() => { load(); }, []);

  const allocated = state.list.reduce((sum, b) => sum + b.share, 0);
  const remaining = 100 - allocated;

  function startAdding() {
    setForm({ name: "", relationship: "", share: String(remaining) });
    setError("");
    setAdding(true);
  }

  async function add(e) {
    e.preventDefault();
    setBusy("add"); setError("");
    try {
      const { data } = await fetchJSON("/api/account/beneficiaries", { method: "POST", body: { action: "add", ...form } });
      setState((s) => ({ ...s, list: data }));
      setAdding(false);
      showToast(`${form.name.trim()} added as a beneficiary`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(b) {
    setBusy(b.id);
    try {
      const { data } = await fetchJSON("/api/account/beneficiaries", { method: "POST", body: { action: "remove", id: b.id } });
      setState((s) => ({ ...s, list: data }));
      showToast(`${b.name} removed`);
    } catch (err) {
      showToast("The beneficiary couldn't be removed. Try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card
      title="Beneficiaries"
      description="If you pass away, your account is transferred to these people in the shares you choose"
      actions={!adding && state.list.length > 0 && remaining > 0 ? (
        <button className="btn btn-ghost btn-sm gap-1.5 text-bronze hover:text-bronze-light" onClick={startAdding}>
          <PlusIcon className="h-4 w-4" /> Add beneficiary
        </button>
      ) : null}
      bodyClassName=""
    >
      {state.loading ? (
        <div className="p-5"><SkeletonRows rows={2} /></div>
      ) : state.error ? (
        <ErrorState message="Beneficiaries couldn't be loaded." onRetry={load} />
      ) : (
        <>
          {state.list.length === 0 && !adding ? (
            <EmptyState
              title="No beneficiaries yet"
              description="Without a beneficiary, your account goes through your estate, which can take months."
              action={<button className="btn btn-primary btn-sm" onClick={startAdding}>Add a beneficiary</button>}
            />
          ) : null}

          {state.list.length > 0 ? (
            <ul className="divide-y divide-line">
              {state.list.map((b) => {
                const [first, ...rest] = b.name.split(" ");
                return (
                  <li key={b.id} className="flex items-center gap-4 px-5 py-4">
                    <Avatar firstName={first} lastName={rest.pop() || ""} seed={b.id} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-marble">{b.name}</p>
                      <p className="text-xs text-muted">{relationshipLabel(b.relationship)}</p>
                    </div>
                    <span className="tabular text-sm text-marble">{b.share}%</span>
                    <button className="btn btn-ghost btn-sm btn-square text-muted hover:text-loss" aria-label={`Remove ${b.name}`}
                      onClick={() => remove(b)} disabled={busy === b.id}>
                      {busy === b.id ? <Spinner /> : <TrashIcon className="h-4 w-4" />}
                    </button>
                  </li>
                );
              })}
              <li className="flex items-center justify-between px-5 py-3 text-xs text-muted">
                <span>{remaining > 0 ? `${remaining}% not yet assigned` : "All of your account is assigned"}</span>
                <span className="tabular">{allocated}% of 100%</span>
              </li>
            </ul>
          ) : null}

          {adding ? (
            <form onSubmit={add} className="border-t border-line p-5 first:border-t-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_7rem]">
                <div>
                  <label htmlFor="ben-name" className="field-label">Full legal name</label>
                  <input id="ben-name" className="field" autoComplete="off" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="ben-rel" className="field-label">Relationship</label>
                  <select id="ben-rel" className="field appearance-auto" required value={form.relationship}
                    onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
                    <option value="" disabled>Choose one</option>
                    {RELATIONSHIPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ben-share" className="field-label">Share</label>
                  <div className="relative">
                    <input id="ben-share" className="field tabular pr-8" inputMode="numeric" required value={form.share}
                      onChange={(e) => setForm({ ...form, share: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
                  </div>
                </div>
              </div>
              {error ? <p className="mt-3 text-sm text-loss" role="alert">{error}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy === "add"}>
                  {busy === "add" ? <Spinner /> : null} Save beneficiary
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}
      <Toast toast={toast} />
    </Card>
  );
}
