/**
 * Idealo-Diagnostic-Test
 * 
 * Ermöglicht den Test einzelner URLs mit detaillierter Log-Ausgabe.
 * Hilfreich um Selektoren zu debuggen oder Spec-Parsing zu prüfen.
 * 
 * Anwendung:
 * node scripts/test-idealo-diagnostics.js <URL> [CHIP_BASE]
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  closeCookieBanner,
  extractVariantUrls,
  scrapeVariant,
  extractSpecsFromPage,
  extractPageTitle,
  extractCheapestOffer
} from "../scrapers/idealo.js";

chromium.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARKS_PATH = path.resolve(__dirname, "../data/benchmarks.json");

async function loadBenchmarks() {
  try {
    const raw = await fs.readFile(BENCHMARKS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function runDiagnostic() {
  const url = process.argv[2];
  const chipBase = process.argv[3] || "M4";

  if (!url) {
    console.error("Fehler: Bitte eine Idealo-URL angeben.");
    console.log("Syntax: node scripts/test-idealo-diagnostics.js <URL> [CHIP_BASE]");
    process.exit(1);
  }

  console.log(`\n--- STARTE DIAGNOSE ---`);
  console.log(`URL:      ${url}`);
  console.log(`Chip:     ${chipBase}`);
  console.log(`-----------------------\n`);

  const benchmarks = await loadBenchmarks();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "de-DE",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });

  const page = await context.newPage();

  try {
    console.log("[1/5] Lade Seite...");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log("[2/5] Behandle Cookie-Banner...");
    await closeCookieBanner(page);

    const pageTitle = await extractPageTitle(page);
    console.log(`SEITENTITEL: "${pageTitle}"`);

    console.log("\n[3/5] Suche Varianten im Karussell...");
    const variants = await extractVariantUrls(page);
    console.log(`GEFUNDEN: ${variants.length} Varianten`);
    variants.forEach((v, i) => console.log(`  ${i+1}. ID: ${v.productId || "n/a"} -> ${v.url}`));

    console.log("\n[4/5] Extrahiere günstigstes Angebot (Zustand: neu)...");
    const offerData = await extractCheapestOffer(page);
    if (offerData) {
      console.log("ROHDATEN ANGEBOT:");
      console.table(offerData);
    } else {
      console.warn("WARNUNG: Kein Angebot gefunden!");
    }

    console.log("\n[5/5] Analysiere Spezifikationen und Metadata...");
    const specs = await extractSpecsFromPage(page);
    console.log("GEFUNDENE SPECS (Key-Value):");
    Object.entries(specs).forEach(([k, v]) => {
        if (!k.startsWith('_')) console.log(`  - ${k.padEnd(20)}: ${v}`);
    });

    const mockProduct = {
      sourceKey: "test-diag",
      model: "Diagnostic MacBook",
      chip: chipBase,
      year: 2024,
      screenInches: 14,
      vendor: "Apple"
    };

    console.log("\n--- FINALES PARSING-ERGEBNIS ---");
    const result = await scrapeVariant(page, url, mockProduct, "neu", benchmarks);
    if (result) {
      console.log(JSON.stringify(result, null, 2));
      console.log("\nERGEBNIS CHECK:");
      console.log(`  ID:        ${result.id}`);
      console.log(`  Titel:     ${result.title}`);
      console.log(`  Preis:     ${result.price} €`);
      console.log(`  RAM:       ${result.ramGb} GB`);
      console.log(`  Storage:   ${result.storageGb} GB`);
      console.log(`  Cores:     ${result.cpuCores}/${result.gpuCores}`);
      console.log(`  Benchmark: ${result.gb6_mc ? "OK" : "FEHLT"}`);
    } else {
      console.error("FEHLER: scrapeVariant gab null zurück.");
    }

  } catch (err) {
    console.error("\nABBRUCH WEGEN FEHLER:");
    console.error(err);
  } finally {
    await browser.close();
    console.log(`\n--- DIAGNOSE BEENDET ---`);
  }
}

runDiagnostic();
