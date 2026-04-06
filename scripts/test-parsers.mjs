import fs from "node:fs/promises";
import path from "node:path";
import { parseMacTradeListing, parseMacTradeDetail } from "./parse-mactrade.mjs";
import { parseAppleListing, parseAppleDetail } from "./parse-apple.mjs";

const TEST_FILES = [
  {
    path: "sourcehtmls/COB_vorgaengermodelle.html",
    type: "mactrade",
    key: "mactrade-vorgaenger",
    url: "https://cb.mactrade.de/restposten/vorgaengermodelle/mac/"
  },
  {
    path: "sourcehtmls/COB_gebrauchtwaren.html",
    type: "mactrade",
    key: "mactrade-gebraucht",
    url: "https://cb.mactrade.de/restposten/gebrauchtware/mac/"
  },
  {
    path: "sourcehtmls/Refurbished Mac - 2025 - MacBook Pro - Apple (DE).html",
    type: "apple",
    key: "apple-refurbished-mbp",
    url: "https://www.apple.com/de/shop/refurbished/mac/14-zoll-macbook-pro"
  }
];

async function test() {
  console.log("Starting Parser Test...");
  const allResults = [];

  for (const test of TEST_FILES) {
    console.log(`\nTesting ${test.path}...`);
    try {
      const html = await fs.readFile(test.path, "utf8");
      let offers = [];
      
      if (test.type === "mactrade") {
        offers = parseMacTradeListing(html, test);
      } else if (test.type === "apple") {
        offers = parseAppleListing(html, test);
      }

      console.log(`  Found ${offers.length} offers.`);
      if (offers.length > 0) {
        // Show first 2 offers for verification
        offers.slice(0, 2).forEach((o, i) => {
          console.log(`  [${i+1}] ${o.title}`);
          console.log(`      CPU: ${o.cpuCores}, GPU: ${o.gpuCores}, RAM: ${o.ramGb}, SSD: ${o.storageGb}, Chip: ${o.chip}, Color: ${o.color}`);
        });
      }
      allResults.push(...offers);
    } catch (err) {
      console.error(`  Error testing ${test.path}:`, err.message);
    }
  }

  await fs.writeFile("test-results.json", JSON.stringify(allResults, null, 2));
  console.log("\nFull results saved to test-results.json");
}

test();
