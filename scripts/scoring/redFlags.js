// scripts/scoring/redFlags.js

/**
 * Identifies critical workflow red flags for a given listing.
 * @param {Object} input - ListingForScoring
 * @returns {string[]}
 */
export function redFlags(input) {
  const flags = [];

  if (input.ramGb !== undefined && input.ramGb < 16)
    flags.push("RAM kritisch – Resolve nicht sinnvoll nutzbar");
  else if (input.ramGb !== undefined && input.ramGb < 18)
    flags.push("RAM zu knapp für Resolve/Gyroflow mit 5K-Material");

  if (input.ssdGb !== undefined && input.ssdGb < 1000)
    flags.push("SSD knapp für Cache, Proxy- und Arbeitsmedien");

  if (input.conditionGrade === "used_poor")
    flags.push("Schlechter Gesamtzustand");

  if (input.chipTier === "base")
    flags.push("Basis-Chip für diesen Workflow nur eingeschränkt geeignet");

  if (input.chipFamily && input.chipTier && input.gpuCores === undefined)
    flags.push("GPU-Kernzahl nicht bestätigt");

  if (input.metalGpu !== undefined && input.metalGpu < 50000)
    flags.push("GPU-Benchmark unter Erwartung für diesen Chip");

  return flags;
}
