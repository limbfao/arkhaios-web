"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { ArrowDownLeftIcon, ArrowUpRightIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import UserContext from "../../UserContext";
import { Badge, Card, Spinner, Toast, VerifyNotice, fetchJSON, sentenceCase, useToast } from "../accountUi";
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { BankMark } from "./bankMark";
import TransferModal from "./transferModal";
import LinkBankModal from "./linkBankModal";
import PlaidLinkButton from "./plaidLinkButton";

const STATUS = {
  COMPLETE: ["Completed", "gain"], COMPLETED: ["Completed", "gain"], SETTLED: ["Completed", "gain"],
  QUEUED: ["Pending", "bronze"], PENDING: ["Pending", "bronze"], APPROVAL_PENDING: ["Pending", "bronze"],
  SENT_TO_CLEARING: ["Processing", "bronze"], APPROVED: ["Processing", "bronze"], SUBMITTED: ["Processing", "bronze"],
  REJECTED: ["Rejected", "loss"], CANCELED: ["Canceled", "muted"], RETURNED: ["Returned", "loss"], FAILED: ["Failed", "loss"],
};

const bankId = (b) => b.key || `${b.institution_id || b.institution_name}-${b.mask}`;

function TransferStatus({ status = "" }) {
  const [label, tone] = STATUS[status.toUpperCase()] || [sentenceCase(status), "muted"];
  return <Badge tone={tone}>{label}</Badge>;
}

function useLoader(url, enabled, pick = (d) => d.data) {
  const [state, setState] = useState({ loading: true, error: false, data: null });
  const load = useCallback(async (quiet) => {
    if (quiet !== true) setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const json = await fetchJSON(url);
      setState({ loading: false, error: false, data: pick(json) });
    } catch (e) {
      setState({ loading: false, error: true, data: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  useEffect(() => { if (enabled) load(); }, [enabled, load]);
  return { ...state, reload: load };
}

export default function Page() {
  const { user } = useContext(UserContext);
  const verified = Boolean(user.kycVerified);

  const banks = useLoader("/api/plaid/banks", true, (d) => (d.data?.banks || []).flat().filter(Boolean));
  const transfers = useLoader("/api/account/get-transfers", verified, (d) => d.data || []);
  const trading = useLoader("/api/account/trading", verified);
  const [link, setLink] = useState(null); // { demo, institutions } or { link_token }
  const [modal, setModal] = useState(null); // "incoming" | "outgoing" | "link"
  const [toast, showToast] = useToast();
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  async function removeBank(bank) {
    setRemoveBusy(true);
    try {
      await fetchJSON("/api/plaid/remove-bank", { method: "POST", body: { key: bankId(bank) } });
      setRemoving(null);
      banks.reload(true);
      showToast(`${bank.institution_name} ••${bank.mask} removed`);
    } catch (e) {
      showToast("The account couldn't be removed. Try again.", "error");
    } finally {
      setRemoveBusy(false);
    }
  }

  useEffect(() => {
    fetch("/api/plaid/generate-link-token")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setLink(data))
      .catch(() => setLink(null));
  }, []);

  // Pending deposits settle in the background: refresh until they complete
  const hasPending = (transfers.data || []).some((t) => (STATUS[(t.status || "").toUpperCase()] || [])[1] === "bronze");
  const reloadTransfers = transfers.reload, reloadTrading = trading.reload;
  useEffect(() => {
    if (!hasPending) return;
    const id = setInterval(() => { reloadTransfers(true); reloadTrading(true); }, 10000);
    return () => clearInterval(id);
  }, [hasPending, reloadTransfers, reloadTrading]);

  const bankList = banks.data || [];
  const cash = trading.data?.cash;

  function onLinked(name) {
    setModal(null);
    banks.reload(true);
    showToast(name ? `${name} account linked` : "Bank account linked");
  }

  function onTransferDone(transfer, message) {
    setModal(null);
    transfers.reload(true);
    trading.reload(true);
    showToast(message);
  }

  const linkButtonClass = "btn btn-ghost btn-sm gap-1.5 text-bronze hover:text-bronze-light";
  const linkButton = link?.demo ? (
    <button type="button" className={linkButtonClass} onClick={() => setModal("link")}>
      <PlusIcon className="h-4 w-4" /> Link bank
    </button>
  ) : link?.link_token ? (
    <PlaidLinkButton token={link.link_token} className={linkButtonClass} onLinked={onLinked}
      onError={(m) => showToast(m, "error")}>
      <PlusIcon className="h-4 w-4" /> Link bank
    </PlaidLinkButton>
  ) : null;

  if (!verified) {
    return <VerifyNotice feature="deposits and withdrawals" />;
  }

  return (
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-center justify-between gap-5 p-5">
        <div>
          <div className="text-sm text-muted">Cash available to withdraw</div>
          {trading.loading ? (
            <Skeleton className="mt-2 h-8 w-40" />
          ) : (
            <div className="stat-value mt-1 text-3xl font-semibold text-marble">{formatCurrency(cash)}</div>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" disabled={!bankList.length} onClick={() => setModal("incoming")}>
            <ArrowDownLeftIcon className="h-4 w-4" /> Deposit
          </button>
          <button type="button" className="btn btn-outline border-line text-marble hover:border-bronze hover:bg-slate hover:text-marble"
            disabled={!bankList.length} onClick={() => setModal("outgoing")}>
            <ArrowUpRightIcon className="h-4 w-4" /> Withdraw
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Linked banks" actions={bankList.length ? linkButton : null} className="self-start" bodyClassName="p-2">
          {banks.loading ? (
            <div className="p-3"><SkeletonRows rows={2} /></div>
          ) : banks.error ? (
            <ErrorState message="Linked banks couldn't be loaded." onRetry={banks.reload} />
          ) : bankList.length === 0 ? (
            <EmptyState
              title="No bank linked yet"
              description="Link a checking or savings account to deposit money and start investing."
              action={linkButton}
            />
          ) : (
            <ul>
              {bankList.map((bank) => {
                const id = bankId(bank);
                return (
                  <li key={id} className="group rounded-btn px-3 py-3">
                    <div className="flex items-center gap-3">
                      <BankMark name={bank.institution_name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-marble">{bank.institution_name}</p>
                        <p className="truncate text-xs text-muted">
                          {bank.name} · {bank.subtype === "savings" ? "Savings" : "Checking"} ••{bank.mask}
                        </p>
                      </div>
                      {removing !== id ? (
                        <button type="button" className="btn btn-ghost btn-xs btn-square text-muted opacity-60 hover:text-loss group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Remove ${bank.institution_name} ••${bank.mask}`} onClick={() => setRemoving(id)}>
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    {removing === id ? (
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-btn bg-basalt/60 px-3 py-2">
                        <span className="text-xs text-muted">Remove this account?</span>
                        <span className="flex gap-1.5">
                          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setRemoving(null)}>Keep</button>
                          <button type="button" className="btn btn-xs border-loss/40 bg-loss/15 text-loss hover:bg-loss/25"
                            disabled={removeBusy} onClick={() => removeBank(bank)}>
                            {removeBusy ? <Spinner className="h-3 w-3" /> : null} Remove
                          </button>
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Transfer history" className="lg:col-span-2" bodyClassName="">
          {transfers.loading ? (
            <div className="p-5"><SkeletonRows rows={4} /></div>
          ) : transfers.error ? (
            <ErrorState message="Your transfers couldn't be loaded." onRetry={transfers.reload} />
          ) : transfers.data.length === 0 ? (
            <EmptyState title="No transfers yet" description="Deposits and withdrawals you make will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="border-line text-xs font-normal text-muted">
                    <th className="pl-5 font-normal">Date</th>
                    <th className="font-normal">Type</th>
                    <th className="font-normal">Status</th>
                    <th className="pr-5 text-right font-normal">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.data.map((t) => {
                    const deposit = (t.direction || "").toUpperCase() === "INCOMING";
                    return (
                      <tr key={t.id} className="border-line">
                        <td className="whitespace-nowrap pl-5 text-sm text-muted">{formatDate(t.created_at)}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate text-muted">
                              {deposit ? <ArrowDownLeftIcon className="h-4 w-4" /> : <ArrowUpRightIcon className="h-4 w-4" />}
                            </span>
                            <div>
                              <p className="text-sm text-marble">{deposit ? "Deposit" : "Withdrawal"}</p>
                              <p className="whitespace-nowrap text-xs text-muted">ACH bank transfer</p>
                            </div>
                          </div>
                        </td>
                        <td><TransferStatus status={t.status} /></td>
                        <td className="whitespace-nowrap pr-5 text-right text-sm font-medium text-marble">
                          {deposit ? "+" : "−"}{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <TransferModal
        open={modal === "incoming" || modal === "outgoing"}
        initialDirection={modal === "outgoing" ? "outgoing" : "incoming"}
        banks={bankList}
        cash={cash}
        onClose={() => setModal(null)}
        onDone={onTransferDone}
      />
      {link?.demo ? (
        <LinkBankModal
          open={modal === "link"}
          institutions={link.institutions || []}
          onClose={() => setModal(null)}
          onLinked={(bank) => onLinked(bank?.institution_name)}
        />
      ) : null}
      <Toast toast={toast} />
    </div>
  );
}
