// scripts/scoring/scoreListing.js
// Multiplicative Bottleneck Scoring System for DaVinci Resolve Workloads

import { lookupBenchmarks } from "./benchmarks.js";
import { ramScore }         from "./ramScore.js";
import { ssdScore }         from "./ssdScore.js";
import { thermalScore }     from "./thermalScore.js";
import { conditionScore }   from "./conditionScore.js";
import { effectivePrice }   from "./effectivePrice.js";
import { redFlags }         from "./redFlags.js";
import { computeConfidence } from "./computeConfidence.js";

// ─── Value Normalization Calibration ──────────────────────────────────────────
// Reference point: M1 Max (65k metal, 12.5k gb6), 64 GB, 2TB, 16", used_good
// at €1700 is the historic "sweet spot" — it scores ~48.7 workflow points and
// achieves ~0.0287 pts/€ which we define as 100% value efficiency.
// Tier reference values:
//   M4 Max 36GB, 4TB, 14", vorgaengermodell at €4649 → ~80 wf score → 61% value
//   M4 Pro 24GB, 512GB, 14", vorgaengermodell at €1955 → ~34 wf score → 62% value
//   M3 8GB, 512GB Apple refurb at €1179 → ~11 wf score → 36% value
const VALUE_NORMALIZATION_FACTOR = 0.0287; // pts/€ = 100% value



/**
 * Determines data completeness for score reliability status.
 */
function computeScoreStatus(input) {
  if (!input.chipFamily || input.ramGb === undefined) return "insufficient_data";
  const allClear =
    input.chipTier    !== undefined &&
    input.gpuCores    !== undefined &&
    input.ssdGb       !== undefined &&
    input.screenSize  !== undefined &&
    input.conditionGrade !== undefined &&
    input.priceEur    !== undefined;
  return allClear ? "ok" : "estimated";
}

/**
 * Computes the raw compute power using real benchmark data.
 * Formula: (Metal_GPU * 0.70) + (Geekbench_MC * 0.30)
 *
 * Why 70/30? DaVinci Resolve is heavily GPU-bound for transcoding,
 * colour grading, and effects rendering; CPU matters for export & codec decode.
 *
 * Returns isFallback=true when we had to estimate from chip family/tier.
 */
function computeRawPower(input) {
  // Prefer raw offer benchmarks; fall back to lookup table
  let metal = (input.metalGpu && input.metalGpu > 0) ? input.metalGpu : 0;
  let gb6   = (input.gb6mc   && input.gb6mc   > 0) ? input.gb6mc   : 0;
  let isFallback = false;

  if (metal === 0 || gb6 === 0) {
    const bench = lookupBenchmarks(input.chipFamily, input.cpuCores, input.gpuCores);
    if (metal === 0) metal = bench.metal_gpu;
    if (gb6   === 0) gb6   = bench.gb6_mc;
  }

  // Last-resort statistical fallback by chip generation + tier
  if (metal === 0) {
    const base = { M1: 35000, M2: 45000, M3: 55000, M4: 68000, M5: 78000 };
    const tier = { base: 1.0, pro: 1.5, max: 2.0 };
    metal = (base[input.chipFamily] ?? 40000) * (tier[input.chipTier] ?? 1.0);
    isFallback = true;
  }
  if (gb6 === 0) {
    const base = { M1: 8500, M2: 10500, M3: 12500, M4: 16000, M5: 18000 };
    const tier = { base: 1.0, pro: 1.3, max: 1.5 };
    gb6 = (base[input.chipFamily] ?? 9000) * (tier[input.chipTier] ?? 1.0);
    isFallback = true;
  }

  const power = (metal * 0.70) + (gb6 * 0.30);
  return { power, metal, gb6, isFallback };
}

/**
 * Core scoring function.
 * Returns an absolute Resolve Performance Score (workflowScore) and a
 * normalized Value Index (valueIndex) representing price efficiency in %.
 *
 * @param {Object} input - Normalized ListingForScoring
 * @returns {Object} ScoringResult
 */
export function scoreListing(input) {
  const ram       = ramScore(input.ramGb);
  const ssd       = ssdScore(input.ssdGb);
  const thermal   = thermalScore(input.screenSize);
  const condition = conditionScore(input);
  const price     = effectivePrice(input);
  const raw       = computeRawPower(input);

  const warnings = [
    ...(raw.isFallback ? ["Benchmarks geschätzt – Score weniger präzise"] : []),
    ...ram.warnings,
    ...ssd.warnings,
    ...thermal.warnings,
    ...condition.warnings,
    ...price.warnings,
  ];

  const status = computeScoreStatus(input);

  let workflowScore = undefined;
  let valueIndex    = undefined;

  if (status !== "insufficient_data") {
    // Combined bottleneck multiplier
    const botMult = ram.multiplier * ssd.multiplier * thermal.multiplier * condition.multiplier;

    // Final effective compute, scaled to a human-readable 0–120 range
    // (M4 Max with perfect config ≈ 100, M1 Base ≈ 12, M5 Max theoretical peak ~120)
    const finalCompute = raw.power * botMult;
    workflowScore = +(finalCompute / 1000).toFixed(1);

    if (price.value) {
      // Value Index: pts/€ normalized to 0-100%.
      // 100% = M1 Max 64GB 2TB used @ ~€1700 (best historically recorded deal).
      const ptsPerEuro = workflowScore / price.value;
      valueIndex = +Math.min(100, (ptsPerEuro / VALUE_NORMALIZATION_FACTOR) * 100).toFixed(1);
    }
  }

  return {
    scoreStatus:       status,
    workflowScore,
    effectivePriceEur: price.value,
    valueIndex,
    scoreBreakdown: {
      rawComputePts: Math.round(raw.power / 1000),
      metalBench:    Math.round(raw.metal),
      gb6Bench:      Math.round(raw.gb6),
      ramMult:       ram.multiplier,
      ramLabel:      ram.label,
      ssdMult:       ssd.multiplier,
      ssdLabel:      ssd.label,
      thermalMult:   thermal.multiplier,
      thermalLabel:  thermal.label,
      conditionMult: condition.multiplier,
      conditionLabel: condition.label,
      total:         workflowScore,
    },
    confidence: computeConfidence(input),
    warnings,
    redFlags:   redFlags(input),
  };
}
