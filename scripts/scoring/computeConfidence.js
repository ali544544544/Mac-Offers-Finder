// scripts/scoring/computeConfidence.js

/**
 * Computes a confidence object indicating how reliable the score is,
 * based on data completeness. Separate from the score itself.
 *
 * @param {Object} input - ListingForScoring
 * @returns {{ overall: number, chip: number, ram: number, ssd: number, screenSize: number, condition: number, price: number }}
 */
export function computeConfidence(input) {
  // CHIP
  let chip;
  if (input.chipFamily && input.chipTier && input.gpuCores !== undefined) {
    chip = 1.0;
  } else if (input.chipFamily && input.chipTier) {
    chip = 0.7;
  } else {
    chip = 0.0;
  }
  // Benchmark-Bonus
  if (input.metalGpu !== undefined || input.gb6mc !== undefined) {
    chip = Math.min(1.0, chip + 0.05);
  }

  // RAM
  const ram = input.ramGb !== undefined ? 1.0 : 0.0;

  // SSD
  const ssd = input.ssdGb !== undefined ? 1.0 : 0.2;

  // SCREEN SIZE
  const screenSize = input.screenSize !== undefined ? 1.0 : 0.6;

  // CONDITION
  let condition = input.conditionGrade !== undefined ? 0.9 : 0.4;
  // Keine Akku/Garantiedaten → kein Bonus möglich, Cap bei 0.9

  // PRICE
  const price = input.priceEur !== undefined ? 1.0 : 0.0;

  // OVERALL (weighted average)
  const overall = +(
    chip       * 0.35 +
    ram        * 0.25 +
    ssd        * 0.15 +
    screenSize * 0.10 +
    condition  * 0.10 +
    price      * 0.05
  ).toFixed(2);

  return { overall, chip, ram, ssd, screenSize, condition, price };
}
