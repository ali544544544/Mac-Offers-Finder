// scripts/scoring/effectivePrice.js

/**
 * Extracts the effective price.
 * Currently just passes through priceEur since no extra costs exist in the dataset.
 * @param {Object} input - ListingForScoring
 * @returns {{ value: number|undefined, source: "explicit"|"insufficient_data", warnings: string[] }}
 */
export function effectivePrice(input) {
  if (input.priceEur === undefined) {
    return { value: undefined, source: "insufficient_data", warnings: ["Preis fehlt"] };
  }
  return { value: input.priceEur, source: "explicit", warnings: [] };
}
