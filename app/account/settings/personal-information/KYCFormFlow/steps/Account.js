import { Field, SelectField } from "../KYCFlowContext";

const FUNDING_SOURCES = [
  { value: "employment_income", label: "Employment income" },
  { value: "investments", label: "Investments" },
  { value: "inheritance", label: "Inheritance" },
  { value: "business_income", label: "Business income" },
  { value: "savings", label: "Savings" },
  { value: "family", label: "Family" },
];

// Insert dashes as digits are typed: 123456789 -> 123-45-6789
function formatSSN(value) {
  const d = value.replace(/\D/g, "").slice(0, 9);
  return [d.slice(0, 3), d.slice(3, 5), d.slice(5)].filter(Boolean).join("-");
}

export default function Account() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field name="first_name" label="Legal first name" autoComplete="given-name" />
        <Field name="middle_name" label="Middle name" hint="Optional" autoComplete="additional-name" />
        <Field name="last_name" label="Legal last name" autoComplete="family-name" />
        <Field name="dob" label="Date of birth" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} />
        <Field name="ssn" label="SSN" hint="123-45-6789" type="password" autoComplete="off"
          inputMode="numeric" maxLength={11} format={formatSSN} />
        <SelectField name="funding_source" label="Main source of funds" options={FUNDING_SOURCES} />
      </div>
      <p className="rounded-btn border border-line bg-basalt/50 px-4 py-3 text-sm text-muted">
        Arkhaios currently serves US citizens who pay taxes in the United States. Your SSN is encrypted and sent only to our
        brokerage partner, Alpaca Securities, to verify your identity.
      </p>
    </div>
  );
}
