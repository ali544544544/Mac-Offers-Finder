// scripts/scoring/ramScore.js

/**
 * Calculates RAM score (max 25).
 * @param {number|undefined} ramGb
 * @returns {{ score: number, source: "explicit"|"insufficient_data", warnings: string[] }}
 */
export function ramScore(ramGb) {
  if (ramGb === undefined) {
    return { score: 0, source: "insufficient_data", warnings: ["RAM fehlt – kein Score möglich"] };
  }
  const score =
    ramGb >= 128 ? 25 :
    ramGb >= 96  ? 24 :
    ramGb >= 64  ? 23 :
    ramGb >= 48  ? 21 :
    ramGb >= 36  ? 19 :
    ramGb >= 32  ? 17 :
    ramGb >= 24  ? 14 :
    ramGb >= 18  ? 10 :
    ramGb >= 16  ?  8 : 0;
  return { score, source: "explicit", warnings: [] };
}
