import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log("Fetching Mac Multi-Core Benchmarks...");
  await page.goto("https://browser.geekbench.com/mac-benchmarks");
  
  // Click on the multi-core tab
  await page.click('a[href="#multi-core"]');
  await page.waitForTimeout(2000); 
  
  const multiCoreData = await page.$$eval('#multi-core table tbody tr', rows => {
    return rows.map(r => {
      const name = r.querySelector('td.name a')?.innerText?.trim();
      const desc = r.querySelector('td.name span.description')?.innerText?.trim();
      const scoreText = r.querySelector('td.score')?.innerText?.trim();
      const score = scoreText ? parseInt(scoreText.replace(/,/g, ''), 10) : 0;
      return { name, desc, score };
    }).filter(d => d.name);
  });

  console.log("Fetching Apple Silicon Metal Benchmarks...");
  await page.goto("https://browser.geekbench.com/metal-benchmarks");
  
  const metalData = await page.$$eval('table tbody tr', rows => {
    return rows.map(r => {
      const name = r.querySelector('td.name a')?.innerText?.trim();
      const scoreText = r.querySelector('td.score')?.innerText?.trim();
      const score = scoreText ? parseInt(scoreText.replace(/,/g, ''), 10) : 0;
      return { name, score };
    }).filter(d => d.name && d.name.includes('Apple'));
  });

  await browser.close();

  console.log("MC found:", multiCoreData.length, "Metal found:", metalData.length);
  fs.writeFileSync('i:/Dokumente/GitHub/Mac-Offers-Finder/data/raw-benchmarks.json', JSON.stringify({multiCoreData, metalData}, null, 2));
  console.log("Saved raw data");
})();
