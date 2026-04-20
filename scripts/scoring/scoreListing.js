// scripts/scoring/scoreListing.js

import { chipScore } from "./chipScore.js";
import { ramScore } from "./ramScore.js";
import { ssdScore } from "./ssdScore.js";
import { thermalScore } from "./thermalScore.js";
import { conditionScore } from "./conditionScore.js";
import { effectivePrice } from "./effectivePrice.js";
import { redFlags } from "./redFlags.js";
import { computeConfidence } from "./computeConfidence.js";

/**
 * Determines the overall score status.
 * - "insufficient_data" if chip or RAM data is missing entirely
 * - "ok" if all fields are present
 * - "estimated" if at least one category used a fallback
 */
function computeScoreStatus(chipResult, ramResult, input) {
  if (chipResult.source === "insufficient_data" || ramResult.source === "insufficient_data") {
    return "insufficient_data";
  }
  const allClear =
    input.chipFamily !== undefined &&
    input.chipTier !== undefined &&
    input.gpuCores !== undefined &&
    input.ramGb !== undefined &&
    input.ssdGb !== undefined &&
    input.screenSize !== undefined &&
    input.conditionGrade !== undefined &&
    input.priceEur !== undefined;

  return allClear ? "ok" : "estimated";
}

/**
 * Orchestrates all scoring components for a single ListingForScoring.
 *
 * @param {Object} input - Normalized ListingForScoring
 * @returns {Object} ScoringResult
 */
export function scoreListing(input) {
  const chip      = chipScore(input);
  const ram       = ramScore(input.ramGb);
  const ssd       = ssdScore(input.ssdGb);
  const thermal   = thermalScore(input.screenSize);
  const condition = conditionScore(input);
  const price     = effectivePrice(input);

  const warnings = [
    ...chip.warnings,
    ...ram.warnings,
    ...ssd.warnings,
    ...thermal.warnings,
    ...condition.warnings,
    ...price.warnings,
  ];

  const status = computeScoreStatus(chip, ram, input);

  let workflowScore = undefined;
  let valueIndex    = undefined;

  if (status !== "insufficient_data") {
    workflowScore = Math.round(
      chip.score + ram.score + ssd.score + thermal.score + condition.score
    );
    if (price.value !== undefined) {
      valueIndex = +(workflowScore / price.value).toFixed(4);
    }
  }

  return {
    scoreStatus:       status,
    workflowScore,
    effectivePriceEur: price.value,
    valueIndex,
    scoreBreakdown: {
      chip:      chip.score,
      ram:       ram.score,
      ssd:       ssd.score,
      thermal:   thermal.score,
      condition: condition.score,
      total:     workflowScore,
    },
    confidence: computeConfidence(input),
    warnings,
    redFlags:   redFlags(input),
  };
}
