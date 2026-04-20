// scripts/scoring/conditionScore.js

import { baseConditionScore } from "./baseConditionScore.js";

/**
 * Calculates the overall condition multiplier.
 * Currently only uses base condition. Future expansion could add
 * battery health and warranty bonuses if data becomes available.
 * @param {Object} input - ListingForScoring
 * @returns {{ multiplier: number, label: string, warnings: string[] }}
 */
export function conditionScore(input) {
  const base = baseConditionScore(input.conditionGrade);
  return {
    multiplier: base.multiplier,
    label: base.label,
    warnings: base.warnings,
  };
}
