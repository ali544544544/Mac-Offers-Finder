// scripts/scoring/benchmarks.js

/**
 * Benchmark database for MacBook chips.
 * Data source: data/benchmarks.json
 */
export const BENCHMARKS = {
  "M1-8-7": { "gb6_mc": 8000, "metal_gpu": 30000 },
  "M1-8-8": { "gb6_mc": 8300, "metal_gpu": 32000 },
  "M1-8-14": { "gb6_mc": 10000, "metal_gpu": 41000 },
  "M1-10-14": { "gb6_mc": 12000, "metal_gpu": 43000 },
  "M1-10-16": { "gb6_mc": 12500, "metal_gpu": 48000 },
  "M1-10-24": { "gb6_mc": 12500, "metal_gpu": 55000 },
  "M1-10-32": { "gb6_mc": 12500, "metal_gpu": 65000 },
  "M2-8-8": { "gb6_mc": 9500, "metal_gpu": 42000 },
  "M2-8-10": { "gb6_mc": 9700, "metal_gpu": 45000 },
  "M2-10-16": { "gb6_mc": 12000, "metal_gpu": 50000 },
  "M2-12-19": { "gb6_mc": 14000, "metal_gpu": 52000 },
  "M2-12-30": { "gb6_mc": 14500, "metal_gpu": 75000 },
  "M2-12-38": { "gb6_mc": 15000, "metal_gpu": 85000 },
  "M3-8-8": { "gb6_mc": 11500, "metal_gpu": 43000 },
  "M3-8-10": { "gb6_mc": 11800, "metal_gpu": 47000 },
  "M3-11-14": { "gb6_mc": 14000, "metal_gpu": 49000 },
  "M3-12-18": { "gb6_mc": 15500, "metal_gpu": 52000 },
  "M3-14-30": { "gb6_mc": 19000, "metal_gpu": 78000 },
  "M3-16-40": { "gb6_mc": 21000, "metal_gpu": 90000 },
  "M4-10-10": { "gb6_mc": 14500, "metal_gpu": 55000 },
  "M4-12-16": { "gb6_mc": 19000, "metal_gpu": 70000 },
  "M4-14-20": { "gb6_mc": 22000, "metal_gpu": 80000 },
  "M4-14-32": { "gb6_mc": 25000, "metal_gpu": 110000 },
  "M4-16-40": { "gb6_mc": 26000, "metal_gpu": 125000 },
  "M5-10-8": { "gb6_mc": 15000, "metal_gpu": 55000 },
  "M5-10-10": { "gb6_mc": 16000, "metal_gpu": 60000 }
};

/**
 * Looks up benchmark values for a given chip configuration.
 * @param {string|undefined} chipFamily - e.g. "M1", "M2"
 * @param {number|undefined} cpu - CPU cores
 * @param {number|undefined} gpu - GPU cores
 * @returns {{ gb6_mc: number, metal_gpu: number }}
 */
export function lookupBenchmarks(chipFamily, cpu, gpu) {
  if (!chipFamily) return { gb6_mc: 0, metal_gpu: 0 };
  
  // Key format: "M1-8-7"
  const cpuVal = cpu || 8;
  const gpuVal = gpu || 8;
  const key = `${chipFamily}-${cpuVal}-${gpuVal}`;
  
  return BENCHMARKS[key] || { gb6_mc: 0, metal_gpu: 0 };
}
