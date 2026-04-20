// scripts/scoring/conditionScore.js

import { baseConditionScore } from "./baseConditionScore.js";

/**
 * Calculates the overall condition score (max 12).
 * Currently only uses base condition. Future expansion could add
 * battery health and warranty bonuses if data becomes available.
 * @param {Object} input - ListingForScoring
 * @returns {{ score: number, warnings: string[] }}
 */
export function conditionScore(input) {
  const base = baseConditionScore(input.conditionGrade);
  return {
    score: base.score, // bereits auf 12 skaliert
    warnings: base.warnings,
  };
}
