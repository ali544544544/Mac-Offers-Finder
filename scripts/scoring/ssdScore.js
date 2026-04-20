// scripts/scoring/ssdScore.js

/**
 * Calculates SSD score (max 10).
 * @param {number|undefined} ssdGb
 * @returns {{ score: number, source: "explicit"|"insufficient_data", warnings: string[] }}
 */
export function ssdScore(ssdGb) {
  if (ssdGb === undefined) {
    return { score: 0, source: "insufficient_data", warnings: ["SSD-Größe fehlt – Score 0 angenommen"] };
  }
  const score =
    ssdGb >= 4000 ? 10 :
    ssdGb >= 2000 ?  9 :
    ssdGb >= 1000 ?  7 :
    ssdGb >= 512  ?  4 : 0;
  return { score, source: "explicit", warnings: [] };
}
