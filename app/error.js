"use client";

import { useEffect, useState } from "react";
import StatusScreen from "./public-ui/StatusScreen";

// Catches runtime errors in any page below the root layout
export default function Error({ error, reset }) {
  // The signed-in app shell (fixed header and sidebar) stays in place around this screen
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    setInApp(!!document.querySelector("body > header"));
  }, []);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      inApp={inApp}
      title="Something went wrong"
      actions={
        <>
          <button type="button" onClick={() => reset()} className="btn btn-primary">Try again</button>
          <a href={inApp ? "/home" : "/"} className="btn btn-ghost border border-line">
            {inApp ? "Go to home" : "Go to the homepage"}
          </a>
        </>
      }
    >
      This page hit an unexpected error. Your account and money aren't affected. Try again, and if it keeps
      happening, email support@arkhaios.io.
      {error?.digest && <span className="mt-3 block text-xs text-muted/70">Reference: {error.digest}</span>}
    </StatusScreen>
  );
}
