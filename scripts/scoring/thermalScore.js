// scripts/scoring/thermalScore.js

/**
 * Calculates thermal multiplier based on screen size chassis.
 * 16" chassis = better thermal headroom for sustained workloads.
 * @param {14|16|undefined} screenSize
 * @returns {{ multiplier: number, label: string, source: "explicit"|"fallback", warnings: string[] }}
 */
export function thermalScore(screenSize) {
  if (screenSize === 16) return { multiplier: 1.0, label: "16\" (Optimal Thermals)", source: "explicit", warnings: [] };
  if (screenSize === 14) return { multiplier: 0.95, label: "14\" (Slight Throttling)", source: "explicit", warnings: [] };
  return { multiplier: 0.95, label: "?\" (Unknown Chassis)", source: "fallback", warnings: ["Displaygröße unbekannt – Fallback (0.95x)"] };
}
