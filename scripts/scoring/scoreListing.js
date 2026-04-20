// scripts/scoring/scoreListing.js

import { chipScore } from "./chipScore.js";
import { ramScore } from "./ramScore.js";
import { ssdScore } from "./ssdScore.js";
import { thermalScore } from "./thermalScore.js";
import { conditionScore } from "./conditionScore.js";
import { effectivePrice } from "./effectivePrice.js";
import { redFlags } from "./redFlags.js";
import { computeConfidence } from "./computeConfidence.js";

import { lookupBenchmarks } from "./benchmarks.js";
import { ramScore } from "./ramScore.js";
import { ssdScore } from "./ssdScore.js";
import { thermalScore } from "./thermalScore.js";
import { conditionScore } from "./conditionScore.js";
import { effectivePrice } from "./effectivePrice.js";
import { redFlags } from "./redFlags.js";
import { computeConfidence } from "./computeConfidence.js";

/**
 * Determines the overall score status.
 */
function computeScoreStatus(input) {
  if (!input.chipFamily || input.ramGb === undefined) return "insufficient_data";
  const allClear =
    input.chipTier !== undefined &&
    input.gpuCores !== undefined &&
    input.ssdGb !== undefined &&
    input.screenSize !== undefined &&
    input.conditionGrade !== undefined &&
    input.priceEur !== undefined;
  return allClear ? "ok" : "estimated";
}

function computeRawPower(input) {
  let metal = input.metalGpu;
  let gb6 = input.gb6mc;
  let isFallback = false;

  // Utilize external benchmarks module if missing
  if (!metal || !gb6 || metal === 0 || gb6 === 0) {
    const benches = lookupBenchmarks(input.chipFamily, input.cpuCores, input.gpuCores);
    if (!metal || metal === 0) metal = benches.metal_gpu;
    if (!gb6 || gb6 === 0) gb6 = benches.gb6_mc;
  }

  // Hard fallback if completely unknown
  if (!metal || metal === 0) {
    const tierMult = input.chipTier === "max" ? 2.0 : input.chipTier === "pro" ? 1.5 : 1.0;
    const genBase = { "M1": 30000, "M2": 40000, "M3": 50000, "M4": 65000, "M5": 75000 };
    metal = (genBase[input.chipFamily] || 35000) * tierMult;
    isFallback = true;
  }
  if (!gb6 || gb6 === 0) {
    const tierMult = input.chipTier === "max" ? 1.5 : input.chipTier === "pro" ? 1.3 : 1.0;
    const genBase = { "M1": 8000, "M2": 10000, "M3": 12000, "M4": 15000, "M5": 17000 };
    gb6 = (genBase[input.chipFamily] || 9000) * tierMult;
    isFallback = true;
  }

  // Engine Formula for Resolve
  const power = (metal * 0.70) + (gb6 * 0.30);
  return { power, metal, gb6, isFallback };
}

export function scoreListing(input) {
  const ram       = ramScore(input.ramGb);
  const ssd       = ssdScore(input.ssdGb);
  const thermal   = thermalScore(input.screenSize);
  const condition = conditionScore(input);
  const price     = effectivePrice(input);

  const raw = computeRawPower(input);

  const warnings = [
    ...(raw.isFallback ? ["Synthetische Benchmarks geschätzt (Flaschenhals-Index ungenau)"] : []),
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
    const rawPower = raw.power;
    const mults = ram.multiplier * ssd.multiplier * thermal.multiplier * condition.multiplier;
    const finalCompute = rawPower * mults;

    // Scale to 0-100+ (Baseline is roughly 100k points for an M4 Max)
    workflowScore = +(finalCompute / 1000).toFixed(2);

    if (price.value) {
      // Normalize Value Index (Points per Euro). 
      // 28 Points/Euro = 100% Value Rating (Historic sweet spot, e.g. Used M1 Max for 1600€)
      const rawValue = workflowScore / price.value; 
      valueIndex = Math.min(100, Math.round((rawValue / 0.028) * 100));
    }
  }

  return {
    scoreStatus:       status,
    workflowScore,
    effectivePriceEur: price.value,
    valueIndex,
    scoreBreakdown: {
      rawCompute: Math.round(raw.power),
      ramMult: ram.multiplier,
      ssdMult: ssd.multiplier,
      thermalMult: thermal.multiplier,
      conditionMult: condition.multiplier,
      total: workflowScore,
    },
    confidence: computeConfidence(input),
    warnings,
    redFlags: redFlags(input),
  };
}
