/**
 * Hilfsskript: Findet Idealo-Produkt-URLs für MacBook Pro Varianten via Suche.
 * Gibt die gefundenen URLs in der Konsole aus.
 * Verwendung: node scripts/find-idealo-urls.js
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(StealthPlugin());

const SEARCHES = [
  { query: "MacBook Pro 14 M5 Pro 2026", label: "M5 Pro 14\"" },
  { query: "MacBook Pro 14 M5 Max 2026", label: "M5 Max 14\"" },
  { query: "MacBook Pro 16 M5 Pro 2026", label: "M5 Pro 16\"" },
  { query: "MacBook Pro 16 M5 Max 2026", label: "M5 Max 16\"" },
  { query: "MacBook Pro 16 M5 2026",     label: "M5 Basis 16\"" },
  { query: "MacBook Pro 14 M4 Pro 2024", label: "M4 Pro 14\"" },
  { query: "MacBook Pro 14 M4 Max 2024", label: "M4 Max 14\"" },
  { query: "MacBook Pro 16 M4 Pro 2024", label: "M4 Pro 16\"" },
  { query: "MacBook Pro 16 M4 Max 2024", label: "M4 Max 16\"" },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function findUrl(page, query) {
  const searchUrl = `https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${encodeURIComponent(query)}`;
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(2000);

  // Cookie-Banner weg
  try {
    const btn = page.locator('button[data-testid="uc-accept-all-button"], button#onetrust-accept-btn-handler').first();
    await btn.waitFor({ state: "visible", timeout: 5000 });
    await btn.click();
    await sleep(800);
  } catch { /* kein Banner */ }

  // Ersten Treffer der Suchergebnisse finden
  const firstResult = await page.locator(
    'a[href*="/preisvergleich/OffersOfProduct/"], a[href*="/preisvergleich/ProductCategory/"]'
  ).first();

  const href = await firstResult.getAttribute("href").catch(() => null);
  if (!href) return null;

  // Relative URL zu absoluter machen
  return href.startsWith("http") ? href : `https://www.idealo.de${href}`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "de-DE",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const results = [];
  for (const { query, label } of SEARCHES) {
    try {
      const url = await findUrl(page, query);
      console.log(`${label}: ${url ?? "NICHT GEFUNDEN"}`);
      results.push({ label, query, url });
    } catch (err) {
      console.error(`${label}: FEHLER – ${err.message}`);
      results.push({ label, query, url: null });
    }
    await sleep(1000);
  }

  await browser.close();

  console.log("\n--- ERGEBNIS (für idealo-config.js) ---");
  for (const r of results) {
    if (r.url?.includes("OffersOfProduct")) {
      console.log(`  { url: "${r.url}", label: "${r.label}" },`);
    }
  }
}

main().catch(console.error);
