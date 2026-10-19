import { useContext, useState } from "react";
import Stepper from "./stepper.js";
import { KYCFlowContextProvider, stepProblem, useKYCFlowContext } from "./KYCFlowContext.js";
import UserContext from "../../../../UserContext";
import Account from "./steps/Account";
import Contact from "./steps/Contact";
import Agreements from "./steps/Agreements.js";
import Disclosures from "./steps/Disclosures.js";
import Final from "./steps/Final";

const STEPS = [
  { label: "Identity", title: "Tell us about yourself", Component: Account },
  { label: "Contact", title: "Where do you live?", Component: Contact },
  { label: "Disclosures", title: "A few regulatory questions", Component: Disclosures },
  { label: "Agreement", title: "Review and accept", Component: Agreements },
];

function Flow({ onDone }) {
  const { userData } = useKYCFlowContext();
  const [step, setStep] = useState(1);
  const [creationStatus, setCreationStatus] = useState(null);
  const [showProblem, setShowProblem] = useState(false);

  const submitted = step > STEPS.length;
  const problem = submitted ? "" : stepProblem(step, userData);

  async function submit() {
    setStep(STEPS.length + 1);
    setCreationStatus(null);
    try {
      const response = await fetch("/api/account/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...userData, country: "USA" }),
      });
      setCreationStatus(await response.json());
    } catch (e) {
      setCreationStatus({ status: "error", message: "We couldn't reach the server. Try again." });
    }
  }

  function next() {
    if (problem) return setShowProblem(true);
    setShowProblem(false);
    if (step === STEPS.length) submit();
    else setStep(step + 1);
  }

  const { title, Component } = STEPS[Math.min(step, STEPS.length) - 1];

  return (
    <div>
      <div className="border-b border-line px-6 py-5">
        <Stepper steps={STEPS.map((s) => s.label)} currentStep={submitted ? STEPS.length + 1 : step} />
      </div>

      {submitted ? (
        <div className="px-6"><Final creationStatus={creationStatus} onDone={onDone} onBack={() => setStep(STEPS.length)} /></div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); next(); }}>
          <div className="px-6 py-6">
            <h3 className="mb-5 text-base font-semibold text-marble">{title}</h3>
            <Component />
            <p className={`mt-4 min-h-[1.25rem] text-sm text-loss ${showProblem && problem ? "" : "invisible"}`} role="alert">
              {problem}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-line px-6 py-4">
            <span className="text-xs text-muted">Step {step} of {STEPS.length}</span>
            <div className="flex gap-2">
              {step > 1 ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowProblem(false); setStep(step - 1); }}>
                  Back
                </button>
              ) : null}
              <button type="submit" className="btn btn-primary btn-sm min-w-[6rem]">
                {step === STEPS.length ? "Submit application" : "Continue"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default function KYCForm({ onDone }) {
  const { user } = useContext(UserContext);
  return (
    <KYCFlowContextProvider initial={{ first_name: user.firstName || "", last_name: user.lastName || "" }}>
      <Flow onDone={onDone} />
    </KYCFlowContextProvider>
  );
}
