import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useKYCFlowContext } from "../KYCFlowContext";

export default function Agreements() {
  const { userData, set } = useKYCFlowContext();

  return (
    <div className="space-y-4">
      <a
        href="https://files.alpaca.markets/disclosures/library/AcctAppMarginAndCustAgmt.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-btn border border-line px-4 py-3 text-sm text-marble hover:border-bronze/50 hover:bg-slate/40"
      >
        <DocumentTextIcon className="h-5 w-5 text-bronze" />
        Alpaca customer account agreement (PDF)
      </a>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-marble">
        <input
          type="checkbox"
          className="checkbox checkbox-primary checkbox-sm mt-0.5"
          checked={userData.account_agreement === "on"}
          onChange={(e) => set("account_agreement", e.target.checked ? "on" : "")}
        />
        I have read and accept the customer account agreement.
      </label>
      <p className="text-xs text-muted">
        By selecting Submit, you confirm the information you entered is accurate. Your application is reviewed by Alpaca
        Securities; we'll let you know if anything else is needed.
      </p>
    </div>
  );
}
