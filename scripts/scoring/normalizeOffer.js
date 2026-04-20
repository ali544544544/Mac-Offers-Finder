// scripts/scoring/normalizeOffer.js

/**
 * Extracts the chip tier (base, pro, max) from offer title/variant text.
 * @param {Object} offer
 * @returns {"base"|"pro"|"max"|undefined}
 */
function extractChipTier(offer) {
  const text = ((offer.title ?? "") + " " + (offer.variant ?? "")).toLowerCase();
  // "MacBook Pro" aus dem Text entfernen, um Fehl-Matches mit dem Chip-Tier "Pro" zu verhindern
  const cleanedText = text.replace(/macbook pro/ig, "");

  if (cleanedText.includes("max")) return "max";
  if (cleanedText.includes("pro")) return "pro";
  if (offer.chip && !cleanedText.includes("max") && !cleanedText.includes("pro")) return "base";
  return undefined;
}

/**
 * Maps raw condition strings to standardized condition grades.
 * @param {string|undefined} condition
 * @returns {"new_sealed"|"apple_refurb"|"refurb_good"|"used_excellent"|"used_good"|"used_fair"|"used_poor"|undefined}
 */
function mapCondition(condition) {
  const map = {
    "neu":               "new_sealed",
    "new":               "new_sealed",
    "apple_refurbished": "apple_refurb",
    "refurbished":       "apple_refurb",
    "vorgaengermodell":  "refurb_good",
    "a-ware":            "used_excellent",
    "gebraucht":         "used_good",
    "gut":               "used_good",
    "akzeptabel":        "used_fair",
    "schlecht":          "used_poor",
  };
  return map[condition?.toLowerCase()] ?? undefined;
}

/**
 * Extracts the chip family (M1, M2, ..., M5) from a chip string like "M4 Max".
 * @param {string|undefined} chip
 * @returns {"M1"|"M2"|"M3"|"M4"|"M5"|undefined}
 */
function extractChipFamily(chip) {
  if (!chip) return undefined;
  const match = chip.match(/M[1-5]/);
  return match ? match[0] : undefined;
}

/**
 * Normalizes a raw offer object into a ListingForScoring.
 * @param {Object} offer - Raw offer from scrapers
 * @returns {Object} ListingForScoring
 */
export function normalizeOffer(offer) {
  return {
    id:             offer.id,
    priceEur:       offer.price,
    chipFamily:     extractChipFamily(offer.chip),
    chipTier:       extractChipTier(offer),
    cpuCores:       offer.cpuCores,
    gpuCores:       offer.gpuCores,
    ramGb:          offer.ramGb,
    ssdGb:          offer.storageGb,
    screenSize:     offer.screenInches,
    conditionGrade: mapCondition(offer.condition),
    metalGpu:       offer.metal_gpu,
    gb6mc:          offer.gb6_mc,
  };
}
