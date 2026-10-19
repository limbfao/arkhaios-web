"use client";

import { usePlaidLink } from "react-plaid-link";

// Production bank linking through Plaid Link
export default function PlaidLinkButton({ token, onLinked, onError, className, children }) {
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: async (publicToken, metadata) => {
      try {
        const response = await fetch("/api/plaid/public-token-exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken, metadata }),
        });
        if (!response.ok) throw new Error();
        onLinked(metadata?.institution?.name);
      } catch (e) {
        onError("The bank account couldn't be linked. Try again.");
      }
    },
  });

  return (
    <button type="button" className={className} onClick={() => open()} disabled={!ready}>
      {children}
    </button>
  );
}
