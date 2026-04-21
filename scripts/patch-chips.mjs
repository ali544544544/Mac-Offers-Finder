import fs from "node:fs";

const IDEALO_RAW = "./data/idealo-raw.json";
const BENCHMARKS_PATH = "./data/benchmarks.json";

function inferChipFromCores(baseChip, cpuCores, gpuCores) {
  if (!cpuCores || !gpuCores) return baseChip;
  if (gpuCores >= 32) return `${baseChip} Max`;
  if (cpuCores >= 12) return `${baseChip} Pro`;
  return baseChip;
}

try {
  const rawData = JSON.parse(fs.readFileSync(IDEALO_RAW, "utf8"));
  const benchmarks = JSON.parse(fs.readFileSync(BENCHMARKS_PATH, "utf8"));
  let updated = 0;

  for (const offer of rawData) {
    if (offer.chip === "M4" || offer.chip === "M5") {
      const parsedChip = inferChipFromCores(offer.chip, offer.cpuCores, offer.gpuCores);
      if (parsedChip !== offer.chip) {
        console.log(`Update ${offer.id}: ${offer.chip} -> ${parsedChip}`);
        offer.chip = parsedChip;
        
        // Update Benchmarks
        const baseChip = parsedChip.replace(/ (Pro|Max|Ultra)/i, "");
        const key = `${baseChip}-${offer.cpuCores}-${offer.gpuCores}`;
        const bench = benchmarks[key] || null;
        
        offer.gb6_mc = bench?.gb6_mc ?? null;
        offer.metal_gpu = bench?.metal_gpu ?? null;
        updated++;
      }
    }
  }

  if (updated > 0) {
    fs.writeFileSync(IDEALO_RAW, JSON.stringify(rawData, null, 2), "utf8");
    console.log(`Einträge erfolgreich aktualisiert: ${updated}`);
  } else {
    console.log("Keine Einträge mussten aktualisiert werden.");
  }
} catch (err) {
  console.error("Fehler beim Patchen:", err);
}
