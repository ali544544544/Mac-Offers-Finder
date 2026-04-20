// scripts/scoring/chipScoreTable.js

/**
 * Lookup table for chip scores.
 * Key format: "{chipFamily}_{tierName}_{gpuCores}"
 * Values: score out of max 45.
 */
export const CHIP_SCORE = {
  "M1_Pro_14": 20,
  "M1_Pro_16": 22,
  "M1_Max_24": 28,
  "M1_Max_32": 31,

  "M2_Pro_16": 24,
  "M2_Pro_19": 26,
  "M2_Max_30": 33,
  "M2_Max_38": 36,

  "M3_Base_10": 18,
  "M3_Pro_18":  27,
  "M3_Max_30":  35,
  "M3_Max_40":  39,

  "M4_Base_10": 22,
  "M4_Pro_16":  31,
  "M4_Pro_20":  34,
  "M4_Max_32":  40,
  "M4_Max_40":  44,

  "M5_Base_10": 24,
  "M5_Pro_10":  30, // Konservative Schätzung für Low-Bin Pro
  "M5_Pro_16":  35,
  "M5_Pro_20":  38,
  "M5_Max_32":  42, // Konservative Schätzung, falls dieser Bin existiert
  "M5_Max_40":  45,
};
