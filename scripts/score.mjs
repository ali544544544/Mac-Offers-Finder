import fs from 'fs';
import path from 'path';

// Lade Benchmarks Datenbank
const benchmarksPath = path.resolve('data/benchmarks.json');
let benchmarks = {};
try {
  if (fs.existsSync(benchmarksPath)) {
    benchmarks = JSON.parse(fs.readFileSync(benchmarksPath, 'utf8'));
  }
} catch (err) {
  console.warn("Could not load benchmarks.json", err);
}

const FALLBACKS = {
  "M1": { ram: 8, ssd: 256 },
  "M1 Pro": { ram: 16, ssd: 512 },
  "M1 Max": { ram: 32, ssd: 512 },
  "M2": { ram: 8, ssd: 256 },
  "M2 Pro": { ram: 16, ssd: 512 },
  "M2 Max": { ram: 32, ssd: 512 },
  "M3": { ram: 8, ssd: 256 },
  "M3 Pro": { ram: 18, ssd: 512 },
  "M3 Max": { ram: 36, ssd: 1024 },
  "M4": { ram: 16, ssd: 256 },
  "M4 Pro": { ram: 24, ssd: 512 },
  "M4 Max": { ram: 36, ssd: 1024 },
  "M5": { ram: 16, ssd: 256 }
};

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function computeScore(offer) {
  let fallbackRam = 8;
  let fallbackSsd = 256;
  if (offer.chip && FALLBACKS[offer.chip]) {
    fallbackRam = FALLBACKS[offer.chip].ram;
    fallbackSsd = FALLBACKS[offer.chip].ssd;
  }
  
  const ram_gb = safeNumber(offer.ramGb, fallbackRam);
  const ssd_gb = safeNumber(offer.storageGb, fallbackSsd);
  const price = safeNumber(offer.price, 999999);
  
  const baseChip = (offer.chip || "M1").replace(/ (Pro|Max|Ultra)/ig, '');
  const chipKey = `${baseChip}-${offer.cpuCores || 8}-${offer.gpuCores || 8}`;
  const bench = benchmarks[chipKey] || { gb6_mc: 0, metal_gpu: 0 };
  
  let cpu_score = bench.gb6_mc;
  let gpu_score = bench.metal_gpu;
  let ram_score = ram_gb * 1500;
  let ssd_score = ssd_gb * 20;

  let total_performance = cpu_score + gpu_score + ram_score + ssd_score;
  let resolve_score_per_euro = Math.round((total_performance / price) * 100) / 100;

  // We assign the new Resolve Score to valueScore to easily integrate with the existing sorting mechanism
  return {
    ramGb: ram_gb,        
    storageGb: ssd_gb,   
    gb6_mc: cpu_score,
    metal_gpu: gpu_score,
    resolveScore: resolve_score_per_euro,
    valueScore: resolve_score_per_euro 
  };
}

export function enrichOffers(offers) {
  return offers.map((offer) => {
    const score = computeScore(offer);
    return {
      ...offer,
      ...score
    };
  });
}

export function pickBestOffers(offers) {
  return [...offers]
    .sort((a, b) => b.resolveScore - a.resolveScore)
    .slice(0, 10);
}
