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
    key: "apple-refurbished-mbp14",
    type: "apple",
    url: "https://www.apple.com/de/shop/refurbished/mac/14-zoll-macbook-pro"
  }
];

async function fetchHtml(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);
  return await page.content();
}

async function scrapeSource(browser, source) {
  const listPage = await browser.newPage({
    locale: "de-DE",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36"
  });

  const listingHtml = await fetchHtml(listPage, source.url);

        let merged = offer;
      if (source.type === "mactrade") {
        merged = parseMacTradeDetail(detailHtml, offer);
      } else if (source.type === "apple") {
        merged = parseAppleDetail(detailHtml, offer);
      }

      if (merged) {
        detailedOffers.push(merged);
      }

  await listPage.close();

  const detailedOffers = [];

  for (const offer of listingOffers) {
    const detailPage = await browser.newPage({
      locale: "de-DE",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36"
    });

    try {
      if (!offer.link) {
        detailedOffers.push(offer);
        await detailPage.close();
        continue;
      }

      console.log(`Detail: ${offer.link}`);
      const detailHtml = await fetchHtml(detailPage, offer.link);

      let merged = offer;
      if (source.type === "mactrade") {
        merged = parseMacTradeDetail(detailHtml, offer);
      } else if (source.type === "apple") {
        merged = parseAppleDetail(detailHtml, offer);
      }

      detailedOffers.push(merged);
    } catch (error) {
      console.error(`Fehler in Detailseite ${offer.link}:`, error.message);
      detailedOffers.push(offer);
    } finally {
      await detailPage.close();
    }
  }

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
