// Fund terms, fees and life-cycle math. Plain functions, usable from server and client components.

export const PERIODS = [
  { value: "quarterly", label: "Quarterly", seconds: 91 * 86400, hint: "Profits and fees settle every 91 days." },
  { value: "monthly", label: "Monthly", seconds: 30 * 86400, hint: "Profits and fees settle every 30 days." },
  { value: "daily", label: "Daily", seconds: 86400, hint: "Settles every day. Mostly useful for short experiments." },
  { value: "hourly", label: "Hourly", seconds: 3600, hint: "Settles every hour. Intended for testing." },
  { value: "5min", label: "Every 5 minutes", seconds: 300, hint: "Settles every 5 minutes. Intended for testing." },
  { value: "1min", label: "Every minute", seconds: 60, hint: "Settles every minute. Intended for testing." },
];

// Mirrors api/fund/exports.js: base fee, share of profits, hurdle the profit must clear
export const FEE_TYPES = [
  { value: "1/10", base: 1, performance: 10, hurdle: 3 },
  { value: "2/20", base: 2, performance: 20, hurdle: 5 },
  { value: "3/30", base: 3, performance: 30, hurdle: 7 },
];

export function periodInfo(value) {
  return PERIODS.find((p) => p.value === value) || { value, label: value || "Not set", seconds: 0, hint: "" };
}

export function feeInfo(value) {
  const known = FEE_TYPES.find((f) => f.value === value);
  if (known) return known;
  const [base, performance] = String(value || "").split("/").map(Number);
  return { value, base: base || 0, performance: performance || 0, hurdle: null };
}

export function feeSentence(value) {
  const f = feeInfo(value);
  const hurdle = f.hurdle != null ? ` when the term's return is above ${f.hurdle}%` : "";
  return `${f.base}% base fee each term, plus ${f.performance}% of profits${hurdle}.`;
}

// Where the fund is in its life cycle: recruiting until recruitEnd, then trading in
// consecutive terms of the disbursement period.
export function termInfo(fund, now = Date.now()) {
  const recruitEnd = (Number(fund?.recruitEnd) || 0) * 1000;
  const recruiting = Boolean(fund?.fundRecruiting) && recruitEnd > now;

  if (recruiting || (fund?.fundRecruiting && !recruitEnd)) {
    const start = Number(fund?.dateCreated) || now;
    return {
      stage: "recruiting", label: "Recruiting ends", start, end: recruitEnd || null,
      progress: recruitEnd ? clamp((now - start) / (recruitEnd - start)) : 0, term: 0,
    };
  }

  const period = periodInfo(fund?.fundDisbursementPeriod).seconds * 1000;
  if (!period || !recruitEnd) {
    return { stage: fund?.fundRecruiting ? "recruiting" : "trading", label: "Next distribution", start: null, end: null, progress: 0, term: 1 };
  }
  const term = Math.max(1, Math.ceil((now - recruitEnd) / period));
  const end = recruitEnd + term * period;
  const start = end - period;
  return { stage: "trading", label: "Next distribution", start, end, progress: clamp((now - start) / period), term };
}

function clamp(n) {
  return Math.min(1, Math.max(0, n || 0));
}

