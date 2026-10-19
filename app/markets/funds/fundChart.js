"use client";

// Fund value chart (1D/1W/1M), shared with the PM pages
import { FundValueChart } from "../../funds-home/fundKit";

export default function FundChart({ symbol, ...props }) {
  return <FundValueChart symbol={String(symbol || "").toUpperCase()} {...props} />;
}
