import { useKYCFlowContext } from "../KYCFlowContext";

const QUESTIONS = [
  ["is_control_person", "Are you a director, officer or 10% shareholder of a publicly traded company?"],
  ["is_affiliated", "Are you affiliated with or employed by FINRA, a stock exchange or a broker-dealer?"],
  ["is_pep", "Are you a senior political figure, or have you been one?"],
  ["is_family_exposed", "Is anyone in your immediate family a senior political figure or a control person of a public company?"],
];

export default function Disclosures() {
  const { userData, set } = useKYCFlowContext();

  return (
    <fieldset className="divide-y divide-line rounded-btn border border-line">
      <legend className="sr-only">Regulatory disclosures</legend>
      {QUESTIONS.map(([key, question]) => (
        <div key={key} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5">
          <p className="min-w-0 flex-1 text-sm text-marble">{question}</p>
          <div className="join" role="radiogroup" aria-label={question}>
            {[[false, "No"], [true, "Yes"]].map(([value, label]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={userData[key] === value}
                onClick={() => set(key, value)}
                className={`btn join-item btn-sm w-16 ${userData[key] === value ? "btn-active border-bronze/60 text-marble" : "btn-ghost border-line text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
