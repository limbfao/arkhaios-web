// Tiny inline trend line, colored by direction (first vs last point)
// `up` overrides the color when the caller knows the direction (e.g. from the live daily change)
export default function Sparkline({ values = [], width = 96, height = 32, reference, up: upOverride, className = "" }) {
  const data = values.filter((v) => Number.isFinite(v));
  if (data.length < 2) {
    return <div className={className} style={{ width, height }} aria-hidden="true" />;
  }
  const base = Number.isFinite(reference) ? reference : data[0];
  const min = Math.min(...data, base);
  const max = Math.max(...data, base);
  const span = max - min || 1;
  const x = (i) => (i / (data.length - 1)) * width;
  const y = (v) => height - 2 - ((v - min) / span) * (height - 4);
  const path = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = typeof upOverride === "boolean" ? upOverride : data[data.length - 1] >= base;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <line x1="0" x2={width} y1={y(base)} y2={y(base)} stroke="#2f2b26" strokeDasharray="2 3" strokeWidth="1" />
      <path
        d={path}
        fill="none"
        stroke={up ? "#4fb59a" : "#e25c5c"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
