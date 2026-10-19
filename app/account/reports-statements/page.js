"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ArrowDownTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import UserContext from "../../UserContext";
import { Badge, Card, VerifyNotice, fetchJSON, sentenceCase } from "../accountUi";
import { EmptyState, ErrorState, SkeletonRows } from "../../components/ui";
import { formatDate } from "../../lib/format";

const TYPE_LABELS = {
  account_statement: "Statement",
  trade_confirmation: "Trade confirmation",
  tax_statement: "Tax document",
  tax_1099_b_form: "Tax document",
  tax_1099_div_form: "Tax document",
  tax_1099_int_form: "Tax document",
  tax_w8: "Tax document",
  account_application: "Agreement",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "Statement", label: "Statements" },
  { id: "Trade confirmation", label: "Trade confirmations" },
  { id: "Tax document", label: "Tax documents" },
];

function typeLabel(type = "") {
  return TYPE_LABELS[type] || (type.startsWith("tax") ? "Tax document" : sentenceCase(type));
}

// "2026-09-01" is a calendar date; parse it in local time so it doesn't shift a day
function localDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return m ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(value);
}

export default function Page() {
  const { user } = useContext(UserContext);
  const [state, setState] = useState({ loading: true, error: false, docs: [] });
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setState({ loading: true, error: false, docs: [] });
    try {
      const { data } = await fetchJSON("/api/account/get-documents");
      const docs = (data || [])
        .filter((d) => !String(d.type).toLowerCase().includes("json"))
        .sort((a, b) => localDate(b.date) - localDate(a.date));
      setState({ loading: false, error: false, docs });
    } catch (e) {
      setState({ loading: false, error: true, docs: [] });
    }
  }, []);

  useEffect(() => { if (user.kycVerified) load(); }, [user.kycVerified, load]);

  const available = useMemo(() => new Set(state.docs.map((d) => typeLabel(d.type))), [state.docs]);
  const visible = state.docs.filter((d) => filter === "all" || typeLabel(d.type) === filter);

  if (!user.kycVerified) return <VerifyNotice feature="statements and tax documents" />;

  return (
    <Card
      title="Statements and documents"
      description="Monthly account statements, trade confirmations and tax forms from Alpaca Securities"
      bodyClassName=""
      actions={
        <div className="hidden gap-1 sm:flex" role="tablist" aria-label="Filter documents">
          {FILTERS.filter((f) => f.id === "all" || available.has(f.id)).map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`btn btn-xs font-normal ${filter === f.id ? "bg-slate text-marble" : "btn-ghost text-muted"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      {state.loading ? (
        <div className="p-5"><SkeletonRows rows={5} /></div>
      ) : state.error ? (
        <ErrorState message="Your documents couldn't be loaded." onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Your first monthly statement is published at the start of the month after your first deposit."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="border-line text-xs text-muted">
                <th className="pl-5 font-normal">Document</th>
                <th className="font-normal">Type</th>
                <th className="font-normal">Date</th>
                <th className="pr-5 text-right font-normal"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((doc) => {
                const name = doc.name || `${typeLabel(doc.type)} ${formatDate(localDate(doc.date), { time: false })}`;
                const base = `/api/account/document?id=${encodeURIComponent(doc.id)}&name=${encodeURIComponent(name)}`;
                return (
                  <tr key={doc.id} className="border-line hover:bg-slate/40">
                    <td className="pl-5">
                      <a href={base} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-slate text-muted group-hover:text-bronze">
                          <DocumentTextIcon className="h-5 w-5" />
                        </span>
                        <span className="text-sm text-marble group-hover:text-bronze-light">{name}</span>
                      </a>
                    </td>
                    <td><Badge tone="muted">{typeLabel(doc.type)}</Badge></td>
                    <td className="whitespace-nowrap text-sm text-muted">{formatDate(localDate(doc.date), { time: false })}</td>
                    <td className="pr-5 text-right">
                      <a href={`${base}&download=1`} download className="btn btn-ghost btn-sm gap-1.5 text-muted hover:text-marble"
                        aria-label={`Download ${name} (PDF)`}>
                        <ArrowDownTrayIcon className="h-4 w-4" /> PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
