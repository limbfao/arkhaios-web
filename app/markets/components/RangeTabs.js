"use client";

// Segmented control for chart ranges
export default function RangeTabs({ ranges, value, onChange, label = "Chart range" }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-btn border border-line bg-basalt p-0.5">
      {ranges.map((r) => {
        const active = r.key === value;
        return (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(r.key)}
            className={`min-w-[2.75rem] rounded-[0.4rem] px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? "bg-slate text-bronze" : "text-muted hover:text-marble"
            }`}
          >
            {r.key}
          </button>
        );
      })}
    </div>
  );
}
