// scripts/scoring/chipScore.js

import { CHIP_SCORE } from "./chipScoreTable.js";
import { makeChipKey } from "./makeChipKey.js";

const GEN_BASE = { M1: 16, M2: 20, M3: 24, M4: 28, M5: 32 };
const TIER_BONUS = { base: 0, pro: 8, max: 14 };

/**
 * Conservative fallback when no exact lookup entry exists.
 * @param {{ chipFamily: string, chipTier: string, gpuCores?: number }} input
 * @returns {number}
 */
function fallbackChipScore({ chipFamily, chipTier, gpuCores }) {
  let score = GEN_BASE[chipFamily] ?? 16;
  score += TIER_BONUS[chipTier] ?? 0;
  if (gpuCores !== undefined) {
    score += Math.min(8, Math.floor(gpuCores / 6));
  }
  return Math.min(44, score); // konservativ: nie höher als bester bekannter Lookup
}

/**
 * Calculates the chip score (max 45).
 * @param {Object} input - ListingForScoring fields
 * @returns {{ score: number, source: "lookup"|"fallback"|"insufficient_data", warnings: string[] }}
 */
export function chipScore(input) {
  const warnings = [];

  if (!input.chipFamily || !input.chipTier) {
    return { score: 0, source: "insufficient_data", warnings: ["Chip-Familie oder Tier fehlt"] };
  }

  if (input.gpuCores === undefined) {
    warnings.push("GPU-Kernzahl fehlt – konservativer Fallback aktiv");
    return {
      score: fallbackChipScore({ chipFamily: input.chipFamily, chipTier: input.chipTier }),
      source: "fallback",
      warnings,
    };
  }

  const key = makeChipKey(input.chipFamily, input.chipTier, input.gpuCores);
  if (CHIP_SCORE[key] !== undefined) {
    return { score: CHIP_SCORE[key], source: "lookup", warnings };
  }

  warnings.push(`Kein Lookup-Eintrag für "${key}" – Fallback aktiv`);
  return {
    score: fallbackChipScore({ chipFamily: input.chipFamily, chipTier: input.chipTier, gpuCores: input.gpuCores }),
    source: "fallback",
    warnings,
  };
}
