/**
 * Merge-Script: Kombiniert alle Scraper-Rohdaten und berechnet Scores.
 *
 * Quellen:
 *  - data/internal-raw.json  (MacTrade + Apple Refurbished, von scripts/scrape.mjs)
 *  - data/idealo-raw.json    (Idealo, von scrapers/idealo.js)
 *
 * Ausgabe:
 *  - data/offers.json        (finales Format inkl. resolveScore / valueScore)
 */

import fs from "node:fs/promises";
import { enrichOffers, pickBestOffers } from "./scoring/index.js";

const INTERNAL_RAW = "data/internal-raw.json";
const IDEALO_RAW   = "data/idealo-raw.json";
const OUTPUT       = "data/offers.json";

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[merge] Konnte ${filePath} nicht laden: ${err.message}`);
    return null;
  }
}

async function main() {
  // --- Lade MacTrade + Apple Roh-Ergebnisse ---
  const internalData = await readJsonFile(INTERNAL_RAW);
  const internalOffers = internalData?.offers ?? [];
  const internalSources = internalData?.sources ?? [];

  if (!internalData) {
    console.warn("[merge] Keine internen Scraper-Daten verfügbar.");
  }

  // --- Lade Idealo Roh-Ergebnisse ---
  const idealoRaw = await readJsonFile(IDEALO_RAW);
  const idealoOffers = idealoRaw ?? [];

  // Idealo als Quelle in die sourceResults aufnehmen
  const idealoSourceResult = {
    key: "idealo",
    url: "https://www.idealo.de",
    type: "idealo",
    offerCount: idealoOffers.length,
    ok: idealoOffers.length > 0,
  };

  // --- Alle roh kombinieren ---
  const allRaw = [...internalOffers, ...idealoOffers];

  console.log(
    `[merge] ${internalOffers.length} interne + ${idealoOffers.length} Idealo = ${allRaw.length} Angebote gesamt.`
  );

  // --- Scoring ---
  const allEnriched = enrichOffers(allRaw);
  const best = pickBestOffers(allEnriched);

  // --- Ausgabe ---
  const result = {
    updatedAt: new Date().toISOString(),
    sources: [...internalSources, idealoSourceResult],
    offers: allEnriched,
    bestOffers: best,
  };

  await fs.writeFile(OUTPUT, JSON.stringify(result, null, 2), "utf8");
  console.log(`[merge] Fertig. ${allEnriched.length} Angebote → ${OUTPUT}`);
  console.log(`[merge] Top 10 nach ResolveScore:`);
  best.slice(0, 5).forEach((o, i) =>
    console.log(`  ${i + 1}. [${o.resolveScore?.toFixed(2)}] ${o.title} – ${o.price} €`)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
