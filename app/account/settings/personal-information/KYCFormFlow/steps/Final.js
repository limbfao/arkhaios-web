import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { Spinner } from "../../../../accountUi";

export default function Final({ creationStatus, onDone, onBack }) {
  if (!creationStatus) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Spinner className="h-8 w-8 text-bronze" />
        <p className="mt-4 text-sm text-muted">Submitting your application…</p>
      </div>
    );
  }

  const ok = creationStatus.status === "success";
  const Icon = ok ? CheckCircleIcon : ExclamationCircleIcon;
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <Icon className={`h-12 w-12 ${ok ? "text-gain" : "text-loss"}`} />
      <h3 className="mt-4 text-lg font-semibold text-marble">
        {ok ? "Application submitted" : "We couldn't submit your application"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {ok
          ? "Your identity is verified and your brokerage account is being opened. You can link a bank and deposit now."
          : creationStatus.message && creationStatus.message !== "error"
            ? creationStatus.message
            : "Check your details and try again."}
      </p>
      <div className="mt-6 flex gap-2">
        {ok ? (
          <button className="btn btn-primary btn-sm" onClick={onDone}>Done</button>
        ) : (
          <button className="btn btn-ghost btn-sm border border-line" onClick={onBack}>Review details</button>
        )}
      </div>
    </div>
  );
}
