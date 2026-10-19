import React from "react";
import styles from "./logos.module.css";
const logoBaseUrl = "https://logos.stockanalysis.com/";
const logos = [
  "msft",
  "hood",
  "meta",
  "aapl",
  "tsla",
  "nflx",
  "nke",
  "pton",
  "amzn",
  "bac",
  "ko",
  "wmt",
  "vz",
  "v",
  "jpm",
  "c",
  "rivn",
  "nio",
  "pypl",
  "adbe",
  "shop",
  "uber",
  "dbx",
  "sono",
  "vzio",
  "lcid",
];

// Logos of a few of the companies whose stock can be traded on Arkhaios.
// The list is rendered twice so the strip can loop without a gap.
export default function Carousel() {
  return (
    <div className={styles.logos} aria-label="Examples of stocks you can trade">
      <div className={styles.logosTrack}>
        {[0, 1].map((copy) => (
          <div className={styles.logosSlide} key={copy} aria-hidden={copy === 1 ? true : undefined}>
            {logos.map((logo) => (
              <img
                key={logo}
                src={`${logoBaseUrl}${logo}.svg`}
                alt={copy === 0 ? `${logo.toUpperCase()} logo` : ""}
                loading="lazy"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
