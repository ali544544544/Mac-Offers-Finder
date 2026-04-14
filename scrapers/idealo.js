/**
 * Idealo MacBook Pro Scraper
 *
 * Strategie:
 *  1. Einstiegs-URL laden (M4 / M5 Produktseite)
 *  2. Alle Varianten-Links aus dem Produkt-Karussell extrahieren (data-product-id)
 *  3. Jede Variante direkt laden
 *  4. Günstigstes "Neu"-Angebot extrahieren
 *  5. "Gebraucht"-Button klicken → günstigstes gebrauchtes Angebot extrahieren
 *  6. Specs aus Angebots-Titel + Spezifikationstabelle parsen
 *  7. Einträge im Zielformat bauen und in data/idealo-raw.json speichern
 *
 * Abhängigkeiten: playwright-extra, puppeteer-extra-plugin-stealth
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  IDEALO_PRODUCTS,
  DEFAULT_CORES,
  CONDITIONS,
  REQUEST_DELAY_MS,
} from "./idealo-config.js";

chromium.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, "../data/idealo-raw.json");
const BENCHMARKS_PATH = path.resolve(__dirname, "../data/benchmarks.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Parst einen deutschen Preisstring ("1.799,00 €") zu einer Ganzzahl in EUR.
 * Gibt null zurück wenn nicht parsbar.
 */
function parsePrice(raw) {
  if (!raw) return null;
  // "1.799,00 €" → "1799.00" → 1799
  const cleaned = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.round(num) : null;
}

/**
 * Baut einen URL-sicheren Slug aus einem Farbnamen.
 * "Space Schwarz" → "space-schwarz"
 */
function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Extrahiert RAM-GB aus einem Angebots-Titel.
 * Sucht nach Mustern wie "16 GB", "16GB".
 */
function parseRam(title) {
  // Spezifische RAM-Muster zuerst
  const m = title.match(/(\d+)\s*GB\s*(?:RAM|Arbeitsspeicher|unified memory)/i);
  if (m) return parseInt(m[1], 10);
  // Nur bekannte RAM-Größen: 8, 16, 18, 24, 32, 36, 48, 64, 96, 128 GB
  const RAM_SIZES = [8, 16, 18, 24, 32, 36, 48, 64, 96, 128];
  const allGb = [...title.matchAll(/(\d+)\s*GB/gi)].map((x) => parseInt(x[1], 10));
  return allGb.find((n) => RAM_SIZES.includes(n)) ?? null;
}

/**
 * Extrahiert Storage-GB aus einem Angebots-Titel.
 * Sucht nach Mustern wie "512 GB", "1 TB", "1TB", "2 TB".
 */
function parseStorage(title) {
  // TB zuerst – z.B. "1 TB", "2TB", "0,5 TB"
  const tb = title.match(/(\d+(?:[.,]\d+)?)\s*TB/i);
  if (tb) return Math.round(parseFloat(tb[1].replace(",", ".")) * 1024);
  // GB – z.B. "512 GB", "1.000 GB" (Idealo-Tausendertrennzeichen)
  const gb = title.match(/(\d[\d.]*\d|\d)\s*GB(?:\s*SSD)?/i);
  if (gb) {
    const raw = gb[1].replace(/\./g, ""); // "1.000" → "1000"
    return parseInt(raw, 10);
  }
  return null;
}

/**
 * Extrahiert Chip-Bezeichnung aus einem Titel.
 * z.B. "Apple M4 Pro", "M4 Max" → "M4 Pro", "M4 Max"
 */
function parseChip(title, expectedChipBase) {
  // Suche nach bekannten Chip-Varianten
  const variants = ["Max", "Pro"];
  for (const v of variants) {
    if (title.includes(`${expectedChipBase} ${v}`)) return `${expectedChipBase} ${v}`;
  }
  if (title.includes(expectedChipBase)) return expectedChipBase;
  return expectedChipBase;
}

/**
 * Extrahiert CPU- und GPU-Kerne aus einem Titel.
 * Muster: "12-Core CPU, 16-Core GPU"
 */
function parseCores(title) {
  const cpu = title.match(/(\d+)-Core CPU/i);
  const gpu = title.match(/(\d+)-Core GPU/i);
  return {
    cpuCores: cpu ? parseInt(cpu[1], 10) : null,
    gpuCores: gpu ? parseInt(gpu[1], 10) : null,
  };
}

/**
 * Extrahiert die Farbe aus dem Titel.
 * Bekannte Idealo-Farben: "Space Schwarz", "Silber"
 */
function parseColor(title) {
  if (title.includes("Space Schwarz") || title.includes("Black")) return "Space Schwarz";
  if (title.includes("Silber") || title.includes("Silver")) return "Silber";
  return null;
}

/**
 * Lädt benchmarks.json und gibt einen Lookup zurück.
 */
async function loadBenchmarks() {
  try {
    const raw = await fs.readFile(BENCHMARKS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    console.warn("[idealo] Konnte benchmarks.json nicht laden, Scores bleiben null.");
    return {};
  }
}

/**
 * Sucht den passenden Benchmark-Eintrag.
 * Key-Format: "M4-10-10", "M4-12-16", etc.
 */
function lookupBenchmark(benchmarks, chip, cpuCores, gpuCores) {
  // Basis-Chip aus z.B. "M4 Pro" → "M4"
  const baseChip = chip.replace(/ (Pro|Max|Ultra)/i, "");
  const key = `${baseChip}-${cpuCores}-${gpuCores}`;
  return benchmarks[key] || null;
}

// ---------------------------------------------------------------------------
// Scraper-Kernlogik
// ---------------------------------------------------------------------------

/**
 * Schließt den Cookie-Banner auf Idealo falls vorhanden.
 */
async function closeCookieBanner(page) {
  try {
    // Idealo nutzt einen "Zustimmen"-Button im Cookie-Banner
    const acceptBtn = page.locator(
      'button[data-testid="uc-accept-all-button"], button#onetrust-accept-btn-handler, button[class*="cookieBanner"] >> text=/Akzeptieren|Zustimmen|Accept/i'
    ).first();
    await acceptBtn.waitFor({ state: "visible", timeout: 5000 });
    await acceptBtn.click();
    await sleep(800);
    console.log("[idealo] Cookie-Banner geschlossen.");
  } catch {
    // Kein Banner sichtbar – ist OK
  }
}

/**
 * Extrahiert alle Varianten-URLs aus dem Produkt-Karussell der Einstiegs-Seite.
 * Idealo stellt Varianten über <a data-product-id="..."> bereit.
 */
async function extractVariantUrls(page) {
  // Warte bis das Karussell geladen ist
  await page.waitForSelector('[data-product-id]', { timeout: 15000 }).catch(() => {});

  const variants = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-product-id]');
    const seen = new Set();
    const results = [];

    for (const el of els) {
      const href = el.href || el.closest('a')?.href;
      if (!href || seen.has(href)) continue;
      seen.add(href);
      results.push({
        url: href,
        productId: el.dataset.productId || el.closest('[data-product-id]')?.dataset?.productId,
      });
    }
    return results;
  });

  // Fallback: Wenn keine Karussell-Links gefunden, aktuelle URL nehmen
  if (variants.length === 0) {
    console.warn("[idealo] Keine Varianten im Karussell gefunden, nutze aktuelle URL als Fallback.");
    return [{ url: page.url(), productId: null }];
  }

  console.log(`[idealo] ${variants.length} Varianten gefunden.`);
  return variants;
}

/**
 * Extrahiert das günstigste Angebot von der aktuell geladenen Produktseite.
 * Gibt null zurück wenn keine Angebote vorhanden.
 */
async function extractCheapestOffer(page) {
  // Warte auf Angebotsliste
  const offerListLoaded = await page
    .waitForSelector('.productOffers-listItemOfferPrice, .productOffers-list', { timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  if (!offerListLoaded) return null;

  // Prüfe ob Angebote vorhanden sind
  const noOffers = await page.locator('.productOffers-noOffers, [data-testid="no-offers"]').isVisible().catch(() => false);
  if (noOffers) return null;

  const offerData = await page.evaluate(() => {
    // Suche nach dem ersten (günstigsten) Angebotseintrag
    const listItems = document.querySelectorAll('.productOffers-listItem');
    if (!listItems.length) return null;

    const first = listItems[0];

    // Preis
    const priceEl = first.querySelector('.productOffers-listItemOfferPrice');
    const priceRaw = priceEl?.innerText?.trim() || null;

    // Versand – suche nach "inkl. Versand" vs. separaten Versandkosten
    const shippingEl = first.querySelector('[class*="shipping"], [class*="Versand"]');
    const shippingRaw = shippingEl?.innerText?.trim() || null;

    // Gesamtpreis aus dem Relocator-Link parsen (enthält price= Parameter)
    const relocatorLink = first.querySelector('a[href*="price="], a[href*="idealo.de"]');
    let relocatorPrice = null;
    if (relocatorLink) {
      const m = relocatorLink.href.match(/[?&]price=([0-9.]+)/);
      if (m) relocatorPrice = parseFloat(m[1]);
    }

    // Händlertitel
    const titleEl = first.querySelector('.productOffers-listItemTitleInner, .productOffers-listItemTitle');
    const titleRaw = titleEl?.innerText?.trim() || null;

    // Händler-Link (Produkt-Link zum Angebot)
    const offerLink = relocatorLink?.href || first.querySelector('a')?.href || null;

    return { priceRaw, shippingRaw, relocatorPrice, titleRaw, offerLink };
  });

  return offerData;
}

/**
 * Liest die Produktspezifikationen aus der Idealo-Speztabelle aus.
 * Gibt ein Objekt mit den gefundenen Specs zurück.
 */
async function extractSpecsFromPage(page) {
  return await page.evaluate(() => {
    const specs = {};

    // Idealo zeigt eine Spec-Tabelle mit "dt/dd" oder "th/td"-Paaren
    const rows = document.querySelectorAll(
      '.technicalSpecs-item, .specs-row, [data-testid*="spec-row"], .keySpecs-item'
    );

    for (const row of rows) {
      const key = (row.querySelector('dt, th, [class*="label"], [class*="key"]')?.innerText || "").trim().toLowerCase();
      const val = (row.querySelector('dd, td, [class*="value"]')?.innerText || "").trim();
      if (key && val) specs[key] = val;
    }

    // Alternativ: Produkt-Titel aus h1
    const h1 = document.querySelector('h1[class*="title"], h1.oopStage-title');
    specs._pageTitle = h1?.innerText?.trim() || document.title;

    return specs;
  });
}

/**
 * Liest die Seitenüberschrift / Produkttitel aus.
 */
async function extractPageTitle(page) {
  return await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1?.innerText?.trim() || document.title;
  });
}

/**
 * Scrapet eine einzelne Varianten-URL für einen gegebenen Zustand ("neu"/"gebraucht").
 * Gibt einen Eintrag im Zielformat zurück oder null.
 */
async function scrapeVariant(page, variantUrl, product, condition, benchmarks) {
  // Wechsel zu gebraucht falls nötig
  if (condition === "gebraucht") {
    const usedBtn = page.locator('#oopStage-conditionButton-used');
    const isVisible = await usedBtn.isVisible().catch(() => false);
    if (!isVisible) {
      console.log(`  [idealo] Kein Gebraucht-Button auf ${variantUrl}, überspringe gebraucht.`);
      return null;
    }
    const isDisabled = await usedBtn.evaluate((el) =>
      el.classList.contains("deltaFilterButtonDisabled") ||
      el.disabled ||
      el.getAttribute("aria-disabled") === "true"
    ).catch(() => false);
    if (isDisabled) {
      console.log(`  [idealo] Gebraucht-Button deaktiviert (keine Angebote).`);
      return null;
    }
    await usedBtn.click();
    // Warte auf AJAX-Neuladung der Angebotsliste
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() =>
      page.waitForTimeout(2000)
    );
  }

  const offerData = await extractCheapestOffer(page);
  if (!offerData) {
    console.log(`  [idealo] Keine Angebote (${condition}) auf ${variantUrl}`);
    return null;
  }

  // Preis ermitteln (Relocator-Preis hat Priorität, dann DOM-Preis)
  let price = offerData.relocatorPrice ? Math.round(offerData.relocatorPrice) : parsePrice(offerData.priceRaw);
  if (!price) return null;

  // Versand aufschlagen falls explizit angegeben (also NICHT "inkl. Versand")
  if (offerData.shippingRaw &&
      !offerData.shippingRaw.toLowerCase().includes("inkl") &&
      !offerData.shippingRaw.toLowerCase().includes("frei")) {
    const shippingPrice = parsePrice(offerData.shippingRaw);
    if (shippingPrice && shippingPrice > 0) price += shippingPrice;
  }

  // Seiten-Titel für Spec-Parsing
  const pageTitle = await extractPageTitle(page);
  const titleForParsing = offerData.titleRaw || pageTitle || "";

  // Chip: aus Seiten-Titel erkennen (z.B. "MacBook Pro 14 M4 Pro")
  const chip = parseChip(pageTitle, product.chip);

  // RAM + Storage aus Angebotstitel oder Seiten-Titel
  const combinedTitle = `${pageTitle} ${titleForParsing}`;
  let ramGb = parseRam(combinedTitle);
  let storageGb = parseStorage(combinedTitle);

  // Farbe
  let color = parseColor(combinedTitle);

  // CPU/GPU-Kerne
  let { cpuCores, gpuCores } = parseCores(combinedTitle);
  if (!cpuCores && DEFAULT_CORES[chip]) cpuCores = DEFAULT_CORES[chip].cpu;
  if (!gpuCores && DEFAULT_CORES[chip]) gpuCores = DEFAULT_CORES[chip].gpu;

  // Specs aus Spec-Tabelle holen (als Fallback/Ergänzung)
  const specs = await extractSpecsFromPage(page);

  // RAM aus Specstabelle
  if (!ramGb) {
    const ramSpec = specs["arbeitsspeicher"] || specs["ram"] || specs["speicher"];
    if (ramSpec) ramGb = parseRam(ramSpec);
  }
  // Storage aus Specstabelle
  if (!storageGb) {
    const ssdSpec = specs["ssd"] || specs["festplatte"] || specs["interner speicher"];
    if (ssdSpec) storageGb = parseStorage(ssdSpec);
  }
  // Farbe aus Specstabelle
  if (!color) {
    const colorSpec = specs["farbe"] || specs["gehäusefarbe"];
    if (colorSpec) color = parseColor(colorSpec);
  }
  // Kerne aus Specstabelle
  if (!cpuCores || !gpuCores) {
    const cpuSpec = specs["prozessor"] || specs["cpu"];
    if (cpuSpec) {
      const parsed = parseCores(cpuSpec);
      if (parsed.cpuCores && !cpuCores) cpuCores = parsed.cpuCores;
      if (parsed.gpuCores && !gpuCores) gpuCores = parsed.gpuCores;
    }
  }

  // Fallbacks
  ramGb = ramGb || null;
  storageGb = storageGb || null;
  color = color || null;
  cpuCores = cpuCores || (DEFAULT_CORES[chip]?.cpu ?? null);
  gpuCores = gpuCores || (DEFAULT_CORES[chip]?.gpu ?? null);

  // Benchmark-Werte aus benchmarks.json
  const bench = lookupBenchmark(benchmarks, chip, cpuCores, gpuCores);

  // ID-Schema: idealo-m4-16gb-512gb-silber-neu
  const chipSlug = chip.toLowerCase().replace(/\s+/g, "");
  const ramSlug = ramGb ? `${ramGb}gb` : "xgb";
  const storageSlug = storageGb ? `${storageGb}gb` : "xgb";
  const colorSlug = slugify(color || "unbekannt");
  const id = `idealo-${chipSlug}-${ramSlug}-${storageSlug}-${colorSlug}-${condition}`;

  // Angebots-Titel aufbauen
  const storageDisplay = storageGb
    ? storageGb >= 1024 ? `${storageGb / 1024} TB` : `${storageGb} GB`
    : "? GB";
  const title = `Apple ${product.model} ${chip} – ${ramGb ?? "?"} GB, ${storageDisplay}${color ? `, ${color}` : ""}`;

  return {
    id,
    sourceKey: product.sourceKey,
    sourceType: "idealo",
    sourceUrl: variantUrl,
    vendor: product.vendor,
    title,
    model: product.model,
    chip,
    year: product.year,
    condition,
    price,
    currency: "EUR",
    ramGb,
    storageGb,
    cpuCores,
    gpuCores,
    screenInches: product.screenInches,
    color,
    link: offerData.offerLink || variantUrl,
    gb6_mc: bench?.gb6_mc ?? null,
    metal_gpu: bench?.metal_gpu ?? null,
    resolveScore: null,
    valueScore: null,
  };
}

// ---------------------------------------------------------------------------
// Haupt-Scrape-Funktion
// ---------------------------------------------------------------------------

export async function scrapeIdealo() {
  const benchmarks = await loadBenchmarks();
  const browser = await chromium.launch({ headless: true });
  const allOffers = [];

  for (const product of IDEALO_PRODUCTS) {
    console.log(`\n[idealo] Starte Scraping: ${product.model} ${product.chip} (${product.year})`);
    console.log(`[idealo] Einstiegs-URL: ${product.url}`);

    const context = await browser.newContext({
      locale: "de-DE",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
    });

    const entryPage = await context.newPage();

    try {
      // Einstiegs-URL laden
      await entryPage.goto(product.url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await entryPage.waitForTimeout(2000);

      // Cookie-Banner schließen
      await closeCookieBanner(entryPage);

      // Varianten-URLs aus Karussell extrahieren
      const variants = await extractVariantUrls(entryPage);
      await entryPage.close();

      console.log(`[idealo] ${variants.length} Varianten zu scrapen.`);

      for (const variant of variants) {
        console.log(`\n[idealo] Variante: ${variant.url}`);

        for (const condition of CONDITIONS) {
          await sleep(REQUEST_DELAY_MS);

          const variantPage = await context.newPage();
          try {
            await variantPage.goto(variant.url, { waitUntil: "domcontentloaded", timeout: 60000 });
            await variantPage.waitForTimeout(1500);

            const offer = await scrapeVariant(
              variantPage,
              variant.url,
              product,
              condition,
              benchmarks
            );

            if (offer) {
              console.log(`  ✓ ${condition}: ${offer.title} – ${offer.price} €`);
              allOffers.push(offer);
            }
          } catch (err) {
            console.error(`  ✗ Fehler (${condition}) bei ${variant.url}:`, err.message);
          } finally {
            await variantPage.close();
          }
        }
      }
    } catch (err) {
      console.error(`[idealo] Fehler bei Produkt ${product.sourceKey}:`, err.message);
      await entryPage.close().catch(() => {});
    }

    await context.close();
  }

  await browser.close();

  // Deduplizieren: bei gleicher ID den günstigeren Preis behalten
  const deduped = new Map();
  for (const offer of allOffers) {
    const existing = deduped.get(offer.id);
    if (!existing || offer.price < existing.price) {
      deduped.set(offer.id, offer);
    }
  }
  const finalOffers = Array.from(deduped.values());

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(finalOffers, null, 2), "utf8");
  console.log(`\n[idealo] Fertig. ${finalOffers.length} Angebote → ${OUTPUT_PATH}`);

  return finalOffers;
}

// ---------------------------------------------------------------------------
// CLI-Einstiegspunkt
// ---------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrapeIdealo().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
