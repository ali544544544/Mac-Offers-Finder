// scripts/scoring/index.js
// Entry-Point für den Scorer

import { normalizeOffer } from "./normalizeOffer.js";
import { scoreListing } from "./scoreListing.js";
import { lookupBenchmarks } from "./benchmarks.js";

/**
 * Scores a single raw offer object.
 * Normalizes the offer, computes the workflow score, and merges the
 * result back onto the original offer with backward-compatible fields.
 *
 * @param {Object} offer - Raw offer from scrapers
 * @returns {Object} Enriched offer with scoring fields
 */
export function scoreOffer(offer) {
  const normalized = normalizeOffer(offer);
  const result     = scoreListing(normalized);
  const benches    = lookupBenchmarks(normalized.chipFamily, normalized.cpuCores, normalized.gpuCores);

  return {
    ...offer,
    // Benchmark-Werte aus Tabelle hinzufügen (falls Scraper sie nicht hat)
    gb6_mc:           offer.gb6_mc || benches.gb6_mc,
    metal_gpu:        offer.metal_gpu || benches.metal_gpu,

    workflowScore:    result.workflowScore,
    valueIndex:       result.valueIndex,
    effectivePrice:   result.effectivePriceEur,
    scoreBreakdown:   result.scoreBreakdown,
    scoreConfidence:  result.confidence.overall,
    scoreStatus:      result.scoreStatus,
    redFlags:         result.redFlags,
    warnings:         result.warnings,
    // Alte Felder überschreiben für Rückwärtskompatibilität:
    resolveScore:     result.workflowScore,
    valueScore:       result.valueIndex,
  };
}

/**
 * Enriches an array of offers with scoring data.
 * Drop-in replacement for the old enrichOffers() from score.mjs.
 *
 * @param {Object[]} offers
 * @returns {Object[]}
 */
export function enrichOffers(offers) {
  return offers.map(scoreOffer);
}

/**
 * Returns the top N offers sorted by workflowScore descending.
 * Drop-in replacement for the old pickBestOffers() from score.mjs.
 *
 * @param {Object[]} offers - Already enriched offers
 * @param {number} [n=10]
 * @returns {Object[]}
 */
export function pickBestOffers(offers, n = 10) {
  return [...offers]
    .sort((a, b) => (b.workflowScore ?? -1) - (a.workflowScore ?? -1))
    .slice(0, n);
}

export { normalizeOffer, scoreListing };
