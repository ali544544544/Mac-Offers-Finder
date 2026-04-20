// scripts/scoring/baseConditionScore.js

/**
 * Condition condition multiplier lookup.
 * Reflects wear and tear risk (battery, keyboard, warranty).
 */
const CONDITION_MULTIPLIER = {
  "new_sealed":     { multiplier: 1.0, label: "Neu / Versiegelt" },
  "apple_refurb":   { multiplier: 1.0, label: "Apple Refurbished" },
  "refurb_good":    { multiplier: 0.95, label: "Refurbished / Sehr Gut" },
  "used_excellent": { multiplier: 0.95, label: "Gebraucht - Hervorragend" },
  "used_good":      { multiplier: 0.90, label: "Gebraucht - Gut" },
  "used_fair":      { multiplier: 0.85, label: "Gebraucht - Akzeptabel" },
  "used_poor":      { multiplier: 0.80, label: "Gebraucht - Schlecht" },
};

/**
 * Calculates condition multiplier.
 * @param {string|undefined} conditionGrade
 * @returns {{ multiplier: number, label: string, source: "explicit"|"fallback", warnings: string[] }}
 */
export function baseConditionScore(conditionGrade) {
  if (conditionGrade === undefined || !CONDITION_MULTIPLIER[conditionGrade]) {
    return { multiplier: 0.85, label: "Unbekannt", source: "fallback", warnings: ["Zustand unbekannt – Fallback (0.85x)"] };
  }
  const entry = CONDITION_MULTIPLIER[conditionGrade];
  return { multiplier: entry.multiplier, label: entry.label, source: "explicit", warnings: [] };
}
