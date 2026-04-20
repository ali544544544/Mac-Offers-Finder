// scripts/scoring/thermalScore.js

/**
 * Calculates thermal score based on screen size (max 8).
 * 16" chassis = better thermal headroom for sustained Resolve workloads.
 * @param {14|16|undefined} screenSize
 * @returns {{ score: number, source: "explicit"|"fallback", warnings: string[] }}
 */
export function thermalScore(screenSize) {
  if (screenSize === 16) return { score: 8, source: "explicit", warnings: [] };
  if (screenSize === 14) return { score: 6, source: "explicit", warnings: [] };
  return { score: 6, source: "fallback", warnings: ["Displaygröße unbekannt – konservativer Fallback 6/8"] };
}
