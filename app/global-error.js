"use client";

import "./globals.css";

// Last-resort error page, used only when the root layout itself fails to render
export default function GlobalError({ reset }) {
  return (
    <html lang="en" data-theme="customBlackTheme">
      <body className="bg-basalt text-marble">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="font-display text-3xl">Arkhaios is having trouble</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              We couldn't load the app. Your account and money aren't affected. Please try again in a moment.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <button type="button" onClick={() => reset()} className="btn btn-primary">Try again</button>
              <a href="/" className="btn btn-ghost border border-line">Go to the homepage</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
