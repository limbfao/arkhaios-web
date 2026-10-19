import { BuildingLibraryIcon } from "@heroicons/react/24/outline";

// Neutral square mark for a bank (no third-party logos)
export function BankMark({ name = "", size = 36 }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-btn border border-line bg-basalt text-muted"
      style={{ width: size, height: size }}
      title={name}
    >
      <BuildingLibraryIcon className="h-[55%] w-[55%]" />
    </span>
  );
}
