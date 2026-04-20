// scripts/scoring/ssdScore.js

/**
 * Calculates SSD multiplier (storage bottleneck for video editing).
 * @param {number|undefined} ssdGb
 * @returns {{ multiplier: number, label: string, source: "explicit"|"insufficient_data", warnings: string[] }}
 */
export function ssdScore(ssdGb) {
  if (ssdGb === undefined) {
    return { multiplier: 0.8, label: "? GB", source: "insufficient_data", warnings: ["SSD-Größe fehlt – Fallback (0.8x)"] };
  }
  
  let multiplier = 0.5;
  let label = `${ssdGb} GB (Unusable)`;

  if (ssdGb >= 4000) { multiplier = 1.05; label = `${ssdGb} GB (Convenient)`; }
  else if (ssdGb >= 2000) { multiplier = 1.0; label = `${ssdGb} GB (Sweet Spot)`; }
  else if (ssdGb >= 1000) { multiplier = 0.95; label = `${ssdGb} GB (Workable)`; }
  else if (ssdGb >= 512) { multiplier = 0.8; label = `${ssdGb} GB (External SSD required)`; }

  return { multiplier, label, source: "explicit", warnings: [] };
}
