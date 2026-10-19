"use client";

import { useEffect, useState } from "react";
import { BookmarkIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { toChartSymbol } from "./symbols";

// Add/remove a symbol from the user's watchlist
export default function WatchButton({ symbol }) {
  const watchSymbol = toChartSymbol(symbol);
  const [watching, setWatching] = useState(null); // null while loading
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/watchlist?symbol=" + encodeURIComponent(watchSymbol))
      .then((r) => r.json())
      .then((data) => !cancelled && setWatching(data.message === "Bookmarked"))
      .catch(() => !cancelled && setWatching(false));
    return () => {
      cancelled = true;
    };
  }, [watchSymbol]);

  async function toggle() {
    const next = !watching;
    setSaving(true);
    setError(false);
    setWatching(next);
    try {
      const r = await fetch("/api/account/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: watchSymbol }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setWatching(!next);
      setError(true);
    }
    setSaving(false);
  }

  const Icon = watching ? BookmarkSolidIcon : BookmarkIcon;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={watching === null || saving}
      aria-pressed={Boolean(watching)}
      title={error ? "Couldn't update your watchlist. Try again." : undefined}
      className={`btn btn-sm gap-2 ${watching ? "btn-ghost border border-bronze/40 text-bronze" : "btn-outline border-line text-marble hover:border-bronze hover:bg-transparent hover:text-bronze"}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {watching ? "On watchlist" : "Add to watchlist"}
    </button>
  );
}
