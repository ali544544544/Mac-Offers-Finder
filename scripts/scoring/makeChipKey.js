// scripts/scoring/makeChipKey.js

/**
 * Builds a lookup key for the CHIP_SCORE table.
 * @param {string} chipFamily - e.g. "M4"
 * @param {string} chipTier   - "base", "pro", or "max"
 * @param {number} gpuCores   - e.g. 32
 * @returns {string} e.g. "M4_Max_32"
 */
export function makeChipKey(chipFamily, chipTier, gpuCores) {
  const tierMap = { base: "Base", pro: "Pro", max: "Max" };
  return `${chipFamily}_${tierMap[chipTier]}_${gpuCores}`;
}
