import { CheckIcon } from "@heroicons/react/20/solid";

// Horizontal progress indicator for the verification steps
export default function Stepper({ steps, currentStep }) {
  return (
    <ol className="flex items-center">
      {steps.map((label, index) => {
        const number = index + 1;
        const done = number < currentStep;
        const current = number === currentStep;
        return (
          <li key={label} className={`flex items-center ${index < steps.length - 1 ? "flex-1" : ""}`}>
            <div className="flex items-center gap-2.5" aria-current={current ? "step" : undefined}>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                  done ? "border-bronze bg-bronze text-basalt" : current ? "border-bronze text-bronze" : "border-line text-muted"
                }`}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : number}
              </span>
              <span className={`hidden whitespace-nowrap text-sm md:inline ${current ? "font-medium text-marble" : "text-muted"}`}>
                {label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span className={`mx-3 h-px flex-1 ${done ? "bg-bronze/60" : "bg-line"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
