// scripts/scoring/baseConditionScore.js

/**
 * Condition score lookup (max 12).
 * Scaled to full 12 points since battery/warranty data is not available.
 */
const CONDITION_SCORE = {
  "new_sealed":     12,
  "apple_refurb":   11,
  "refurb_good":    10,
  "used_excellent":  9,
  "used_good":       7,
  "used_fair":       4,
  "used_poor":       1,
};

/**
 * Calculates condition score (max 12).
 * @param {string|undefined} conditionGrade
 * @returns {{ score: number, source: "explicit"|"fallback", warnings: string[] }}
 */
export function baseConditionScore(conditionGrade) {
  if (conditionGrade === undefined) {
    return { score: 5, source: "fallback", warnings: ["Zustand unbekannt – Fallback 5/12"] };
  }
  return { score: CONDITION_SCORE[conditionGrade], source: "explicit", warnings: [] };
}
