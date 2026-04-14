/**
 * Idealo Scraper – Konfiguration
 *
 * Enthält die Einstiegs-URLs für jede MacBook-Pro-Produktgruppe sowie
 * CPU-/GPU-Kern-Mappings für die lokale Spec-Erkennung.
 *
 * Benchmarks kommen aus data/benchmarks.json (nicht hier hartcodiert).
 */

export const IDEALO_PRODUCTS = [
  {
    url: "https://www.idealo.de/preisvergleich/OffersOfProduct/205027047_-macbook-pro-14-m4-2024-apple.html",
    sourceKey: "idealo-m4-14",
    model: "MacBook Pro 14",
    chip: "M4",
    year: 2024,
    screenInches: 14,
    vendor: "Apple",
  },
  {
    url: "https://www.idealo.de/preisvergleich/OffersOfProduct/209562388_-macbook-pro-14-m5-2026-apple.html",
    sourceKey: "idealo-m5-14",
    model: "MacBook Pro 14",
    chip: "M5",
    year: 2026,
    screenInches: 14,
    vendor: "Apple",
  },
];

/**
 * CPU/GPU-Kern-Tabelle nach Chip + RAM.
 * Wird beim Parsing des "title" der Angebote genutzt, falls
 * die Spec-Tabelle nichts hergibt.
 *
 * Format: { [chip]: { [cpuCores]: gpuCores[] } }
 */
export const CORE_MAP = {
  M4: {
    10: [10],
    12: [16],
    14: [20],
  },
  "M4 Pro": {
    12: [16],
    14: [20],
  },
  "M4 Max": {
    14: [32],
    16: [40],
  },
  M5: {
    10: [10],
    12: [16],
    14: [20],
  },
  "M5 Pro": {
    12: [16],
    14: [20],
  },
  "M5 Max": {
    14: [32],
    16: [40],
  },
};

/**
 * Standardkern-Konfiguration falls nicht aus dem Titel parsbar.
 * Entspricht der günstigsten Basisvariante pro Chip.
 */
export const DEFAULT_CORES = {
  M4:       { cpu: 10, gpu: 10 },
  "M4 Pro": { cpu: 12, gpu: 16 },
  "M4 Max": { cpu: 14, gpu: 32 },
  M5:       { cpu: 10, gpu: 10 },
  "M5 Pro": { cpu: 12, gpu: 16 },
  "M5 Max": { cpu: 14, gpu: 32 },
};

/** Zustände die immer geprüft werden */
export const CONDITIONS = ["neu", "gebraucht"];

/** Pause zwischen Seiten-Requests (ms) */
export const REQUEST_DELAY_MS = 500;
