import { createContext, useContext, useState } from "react";

const StepperContext = createContext({ userData: {}, setUserData: () => {} });

export function KYCFlowContextProvider({ initial = {}, children }) {
  const [userData, setUserData] = useState({ country: "USA", ...initial });
  return (
    <StepperContext.Provider value={{ userData, setUserData }}>
      {children}
    </StepperContext.Provider>
  );
}

export function useKYCFlowContext() {
  const { userData, setUserData } = useContext(StepperContext);
  const set = (name, value) => setUserData((prev) => ({ ...prev, [name]: value }));
  return { userData, setUserData, set };
}

// Labeled text field bound to a key of the KYC form data
export function Field({ name, label, hint, className = "", format, ...props }) {
  const { userData, set } = useKYCFlowContext();
  return (
    <div className={className}>
      <label htmlFor={`kyc-${name}`} className="field-label flex justify-between gap-2">
        <span>{label}</span>
        {hint ? <span className="text-xs text-muted/80">{hint}</span> : null}
      </label>
      <input
        id={`kyc-${name}`}
        name={name}
        className="field"
        value={userData[name] || ""}
        onChange={(e) => set(name, format ? format(e.target.value) : e.target.value)}
        {...props}
      />
    </div>
  );
}

export function SelectField({ name, label, options, className = "" }) {
  const { userData, set } = useKYCFlowContext();
  return (
    <div className={className}>
      <label htmlFor={`kyc-${name}`} className="field-label">{label}</label>
      <select
        id={`kyc-${name}`}
        name={name}
        className="field appearance-auto"
        value={userData[name] || ""}
        onChange={(e) => set(name, e.target.value)}
      >
        <option value="" disabled>Choose one</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// Per-step validation; returns a message for the first problem, or ""
export function stepProblem(step, d) {
  if (step === 1) {
    if (!d.first_name?.trim() || !d.last_name?.trim()) return "Enter your legal first and last name.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dob || "")) return "Enter your date of birth.";
    const age = (Date.now() - new Date(d.dob)) / (365.25 * 86400000);
    if (age < 18 || age > 120) return "You must be at least 18 years old to open an account.";
    if (!/^\d{3}-\d{2}-\d{4}$/.test(d.ssn || "")) return "Enter your Social Security number as 123-45-6789.";
    if (!d.funding_source) return "Choose your main source of funds.";
  }
  if (step === 2) {
    if (!/^\d{10}$/.test(d.phone || "")) return "Enter a 10-digit US phone number.";
    if (!/^\d+\s+\S+/.test(d.address || "")) return "Enter a street address, like 42 Wallaby Way.";
    if (!d.city?.trim()) return "Enter your city.";
    if (!d.state) return "Choose your state.";
    if (!/^\d{5}(-\d{4})?$/.test(d.postal_code || "")) return "Enter a 5-digit ZIP code.";
  }
  if (step === 3) {
    const keys = ["is_control_person", "is_affiliated", "is_pep", "is_family_exposed"];
    if (keys.some((k) => typeof d[k] !== "boolean")) return "Answer every question to continue.";
    if (keys.some((k) => d[k] === true)) return "We can't open accounts online for people with these affiliations yet. Contact support to apply.";
  }
  if (step === 4 && d.account_agreement !== "on") return "Accept the customer agreement to continue.";
  return "";
}
