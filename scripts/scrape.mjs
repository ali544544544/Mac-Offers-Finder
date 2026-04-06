import { chromium } from "playwright";
import fs from "node:fs/promises";
import { parseMacTradeListing, parseMacTradeDetail } from "./parse-mactrade.mjs";
import { parseAppleListing, parseAppleDetail } from "./parse-apple.mjs";
import { enrichOffers, pickBestOffers } from "./score.mjs";

const SOURCES = [
  {
    key: "mactrade-vorgaenger",
    type: "mactrade",
    url: "https://cb.mactrade.de/restposten/vorgaengermodelle/mac/"
  },
  {
    key: "mactrade-gebraucht",
    type: "mactrade",
    url: "https://cb.mactrade.de/restposten/gebrauchtware/mac/"
  },
  {
    key: "mactrade-aware",
    type: "mactrade",
    url: "https://cb.mactrade.de/restposten/a-ware/mac/"
  },
  {
    key: "apple-refurbished-mbp",
    type: "apple",
    url: "https://www.apple.com/de/shop/refurbished/mac/macbook-pro"
  }
];

async function fetchHtml(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);
  return await page.content();
}

async function scrapeSource(browser, source) {
  const browserContext = await browser.newContext({
    locale: "de-DE",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36"
  });

  const allListingOffers = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages) {
    const pageUrl = source.type === "apple" 
      ? `${source.url}${source.url.includes("?") ? "&" : "?"}page=${currentPage}`
      : `${source.url}${source.url.includes("?") ? "&" : "?"}p=${currentPage}`;

    console.log(`  Page ${currentPage}/${totalPages || "?"}: ${pageUrl}`);
    const page = await browserContext.newPage();
    const html = await fetchHtml(page, pageUrl);

    let pageOffers = [];
    if (source.type === "mactrade") {
      pageOffers = parseMacTradeListing(html, source);
      // Detect total pages for MacTrade (Shopware 6 pagination)
      const lastPageMatch = html.match(/class="pagination-nav-item">(\d+)<\/li>/g);
      if (lastPageMatch && currentPage === 1) {
        const lastPageStr = lastPageMatch[lastPageMatch.length - 1].match(/>(\d+)</)[1];
        totalPages = Math.min(Number(lastPageStr), 10); // cap at 10 to be safe
      }
    } else if (source.type === "apple") {
      pageOffers = parseAppleListing(html, source);
      // Detect total pages for Apple
      const totalMatch = html.match(/data-autom="paginationTotalPages">(\d+)<\/span>/);
      if (totalMatch && currentPage === 1) {
        totalPages = Math.min(Number(totalMatch[1]), 10);
      }
    }

    allListingOffers.push(...pageOffers);
    await page.close();
    
    // Stop if no items found on this page (safety)
    if (pageOffers.length === 0) break;
    
    currentPage++;
  }

  const detailedOffers = [];
  console.log(`  Found ${allListingOffers.length} offers. Scraping details...`);

  for (const offer of allListingOffers) {
    const detailPage = await browserContext.newPage();
    try {
      if (!offer.link) {
        detailedOffers.push(offer);
        await detailPage.close();
        continue;
      }

      console.log(`    Detail: ${offer.link}`);
      const detailHtml = await fetchHtml(detailPage, offer.link);

      let merged = offer;
      if (source.type === "mactrade") {
        merged = parseMacTradeDetail(detailHtml, offer);
      } else if (source.type === "apple") {
        merged = parseAppleDetail(detailHtml, offer);
      }

      if (merged) {
        detailedOffers.push(merged);
      }
    } catch (error) {
      console.error(`    Fehler in Detailseite ${offer.link}:`, error.message);
      detailedOffers.push(offer);
    } finally {
      await detailPage.close();
    }
  }

  await browserContext.close();
  return detailedOffers;
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const allOffers = [];
  const sourceResults = [];

  for (const source of SOURCES) {
    console.log(`Scrape Listing: ${source.url}`);

    try {
      const offers = await scrapeSource(browser, source);
      const enriched = enrichOffers(offers);

      allOffers.push(...enriched);

      sourceResults.push({
        key: source.key,
        url: source.url,
        type: source.type,
        offerCount: enriched.length,
        ok: true
      });
    } catch (error) {
      console.error(`Fehler bei ${source.url}:`, error.message);

      sourceResults.push({
        key: source.key,
        url: source.url,
        type: source.type,
        offerCount: 0,
        ok: false,
        error: error.message
      });
    }
  }

  const best = pickBestOffers(allOffers);

  const result = {
    updatedAt: new Date().toISOString(),
    sources: sourceResults,
    offers: allOffers,
    bestOffers: best
  };

  await fs.writeFile("data/offers.json", JSON.stringify(result, null, 2), "utf8");
  console.log(`Fertig. ${allOffers.length} Angebote gespeichert.`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
