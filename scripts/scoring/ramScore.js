// scripts/scoring/ramScore.js

/**
 * Calculates RAM multiplier (bottleneck factor for DaVinci Resolve).
 * @param {number|undefined} ramGb
 * @returns {{ multiplier: number, label: string, source: "explicit"|"insufficient_data", warnings: string[] }}
 */
export function ramScore(ramGb) {
  if (ramGb === undefined) {
    return { multiplier: 0.8, label: "? GB", source: "insufficient_data", warnings: ["RAM fehlt – Fallback Multiplikator (0.8x)"] };
  }
  
  let multiplier = 0.4;
  let label = `${ramGb} GB (Extreme Bottleneck)`;

  if (ramGb >= 96) { multiplier = 1.15; label = `${ramGb} GB (Massive Headroom)`; }
  else if (ramGb >= 64) { multiplier = 1.1; label = `${ramGb} GB (Excellent)`; }
  else if (ramGb >= 48) { multiplier = 1.05; label = `${ramGb} GB (Great)`; }
  else if (ramGb >= 32) { multiplier = 1.0; label = `${ramGb} GB (Sweet Spot)`; }
  else if (ramGb >= 24) { multiplier = 0.85; label = `${ramGb} GB (Slight Swapping)`; }
  else if (ramGb >= 16) { multiplier = 0.75; label = `${ramGb} GB (Heavy Swapping)`; }

  return { multiplier, label, source: "explicit", warnings: [] };
}
