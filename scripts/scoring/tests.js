// scripts/scoring/tests.js
// Ausführen: node scripts/scoring/tests.js

import { normalizeOffer } from "./normalizeOffer.js";
import { scoreListing } from "./scoreListing.js";
import { scoreOffer } from "./index.js";

let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

function assertEq(actual, expected, testName) {
  assert(
    actual === expected,
    testName,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

function assertIncludes(arr, value, testName) {
  assert(
    Array.isArray(arr) && arr.some((s) => s.includes(value)),
    testName,
    `expected array to include string containing "${value}", got ${JSON.stringify(arr)}`
  );
}

// ─── Test 1: M4 Max 36 GB 4TB 14" vorgaengermodell → workflowScore 85, status ok ───
console.log("\nTest 1: M4 Max 36 GB 4TB 14\" vorgaengermodell");
{
  const offer = {
    id: "test-1", title: "MacBook Pro 14 M4 Max", variant: "M4 Max 32-Core GPU",
    chip: "M4 Max", price: 4649, ramGb: 36, storageGb: 4000,
    cpuCores: 14, gpuCores: 32, screenInches: 14, condition: "vorgaengermodell",
    metal_gpu: 110000, gb6_mc: 25000,
  };
  const n = normalizeOffer(offer);
  const r = scoreListing(n);
  assertEq(r.scoreBreakdown.chip, 40, "chip = 40 (M4_Max_32 lookup)");
  assertEq(r.scoreBreakdown.ram, 19, "ram = 19 (36 GB)");
  assertEq(r.scoreBreakdown.ssd, 10, "ssd = 10 (4 TB)");
  assertEq(r.scoreBreakdown.thermal, 6, "thermal = 6 (14\")");
  assertEq(r.scoreBreakdown.condition, 10, "condition = 10 (refurb_good)");
  assertEq(r.workflowScore, 85, "workflowScore = 85");
  assertEq(r.scoreStatus, "ok", "status ok");
  assert(r.redFlags.length === 0, "no red flags");
}

// ─── Test 2: M5 Max 40 GPU 64 GB 2TB 16" neu → ~97, status ok ───
console.log("\nTest 2: M5 Max 40 GPU 64 GB 2TB 16\" neu");
{
  const offer = {
    id: "test-2", title: "MacBook Pro 16 M5 Max", variant: "M5 Max 40-Core GPU",
    chip: "M5 Max", price: 5999, ramGb: 64, storageGb: 2000,
    cpuCores: 16, gpuCores: 40, screenInches: 16, condition: "neu",
  };
  const n = normalizeOffer(offer);
  const r = scoreListing(n);
  // chip 45 + ram 23 + ssd 9 + thermal 8 + condition 12 = 97
  assertEq(r.workflowScore, 97, "workflowScore = 97");
  assertEq(r.scoreStatus, "ok", "status ok");
  assert(r.redFlags.length === 0, "no red flags");
}

// ─── Test 3: M3 Pro 18 GB 512 GB 14" gebraucht → ~56, redFlag SSD ───
console.log("\nTest 3: M3 Pro 18 GB 512 GB 14\" gebraucht");
{
  const offer = {
    id: "test-3", title: "MacBook Pro 14 M3 Pro", variant: "M3 Pro 18-Core GPU",
    chip: "M3 Pro", price: 1800, ramGb: 18, storageGb: 512,
    cpuCores: 12, gpuCores: 18, screenInches: 14, condition: "gebraucht",
  };
  const n = normalizeOffer(offer);
  const r = scoreListing(n);
  // chip 27 + ram 10 + ssd 4 + thermal 6 + condition 7 = 54
  assertEq(r.workflowScore, 54, "workflowScore = 54");
  assertEq(r.scoreStatus, "ok", "status ok");
  assertIncludes(r.redFlags, "SSD knapp", "redFlag SSD");
}

// ─── Test 4: M2 Max 32 GB 1TB 16" gebraucht → ~72 ───
console.log("\nTest 4: M2 Max 32 GB 1TB 16\" gebraucht");
{
  const offer = {
    id: "test-4", title: "MacBook Pro 16 M2 Max", variant: "M2 Max 30-Core GPU",
    chip: "M2 Max", price: 2200, ramGb: 32, storageGb: 1000,
    cpuCores: 12, gpuCores: 30, screenInches: 16, condition: "gebraucht",
  };
  const n = normalizeOffer(offer);
  const r = scoreListing(n);
  // chip 33 + ram 17 + ssd 7 + thermal 8 + condition 7 = 72
  assertEq(r.workflowScore, 72, "workflowScore = 72");
  assertEq(r.scoreStatus, "ok", "status ok");
}

// ─── Test 5: M4 Pro, RAM vorhanden, SSD fehlt → status estimated ───
console.log("\nTest 5: M4 Pro, RAM vorhanden, SSD fehlt");
{
  const offer = {
    id: "test-5", title: "MacBook Pro 14 M4 Pro", variant: "M4 Pro 20-Core GPU",
    chip: "M4 Pro", price: 2800, ramGb: 24,
    cpuCores: 14, gpuCores: 20, screenInches: 14, condition: "neu",
  };
  const n = normalizeOffer(offer);
  const r = scoreListing(n);
  assertEq(r.scoreStatus, "estimated", "status estimated");
  assertEq(r.scoreBreakdown.ssd, 0, "ssd score = 0");
  assertIncludes(r.warnings, "SSD-Größe fehlt", "warning about missing SSD");
}

// ─── Test 6: Chip fehlt → status insufficient_data ───
console.log("\nTest 6: Chip fehlt");
{
  const offer = {
    id: "test-6", title: "MacBook Pro", price: 1500, ramGb: 16,
  };
  const n = normalizeOffer(offer);
  const r = scoreListing(n);
  assertEq(r.scoreStatus, "insufficient_data", "status insufficient_data");
  assertEq(r.workflowScore, undefined, "workflowScore undefined");
}

// ─── Test 7: chipTier Base → redFlag ───
console.log("\nTest 7: chipTier Base → redFlag");
{
  const offer = {
    id: "test-7", title: "MacBook Pro 14 M4", variant: "",
    chip: "M4", price: 1899, ramGb: 24, storageGb: 512,
    cpuCores: 10, gpuCores: 10, screenInches: 14, condition: "neu",
  };
  const n = normalizeOffer(offer);
  const r = scoreListing(n);
  assertIncludes(r.redFlags, "Basis-Chip", "redFlag Basis-Chip");
}

// ─── Test 8: RAM < 16 → redFlag ───
console.log("\nTest 8: RAM < 16 → redFlag");
{
  const offer = {
    id: "test-8", title: "MacBook Pro 14 M3", variant: "",
    chip: "M3", price: 1200, ramGb: 8, storageGb: 256,
    cpuCores: 8, gpuCores: 10, screenInches: 14, condition: "gebraucht",
  };
  const n = normalizeOffer(offer);
  const r = scoreListing(n);
  assertIncludes(r.redFlags, "RAM kritisch", "redFlag RAM kritisch");
}

// ─── Test 9: conditionGrade fehlt → fallback 5, warning, estimated ───
console.log("\nTest 9: conditionGrade fehlt");
{
  const offer = {
    id: "test-9", title: "MacBook Pro 16 M4 Max", variant: "M4 Max 40-Core GPU",
    chip: "M4 Max", price: 4000, ramGb: 48, storageGb: 2000,
    cpuCores: 16, gpuCores: 40, screenInches: 16,
  };
  const n = normalizeOffer(offer);
  const r = scoreListing(n);
  assertEq(r.scoreBreakdown.condition, 5, "condition fallback = 5");
  assertIncludes(r.warnings, "Zustand unbekannt", "warning about unknown condition");
  assertEq(r.scoreStatus, "estimated", "status estimated");
}

// ─── Test 10: Deterministisch ───
console.log("\nTest 10: Deterministisch");
{
  const offer = {
    id: "test-10", title: "MacBook Pro 14 M4 Max", variant: "M4 Max 32-Core GPU",
    chip: "M4 Max", price: 4649, ramGb: 36, storageGb: 4000,
    cpuCores: 14, gpuCores: 32, screenInches: 14, condition: "vorgaengermodell",
  };
  const r1 = scoreListing(normalizeOffer(offer));
  const r2 = scoreListing(normalizeOffer(offer));
  assert(
    JSON.stringify(r1) === JSON.stringify(r2),
    "identical input → identical output"
  );
}

// ─── Test 11: scoreOffer backward-compat fields ───
console.log("\nTest 11: scoreOffer backward-compatibility");
{
  const offer = {
    id: "test-11", title: "MacBook Pro 14 M4 Max", variant: "M4 Max 32-Core GPU",
    chip: "M4 Max", price: 4649, ramGb: 36, storageGb: 4000,
    cpuCores: 14, gpuCores: 32, screenInches: 14, condition: "vorgaengermodell",
  };
  const enriched = scoreOffer(offer);
  assertEq(enriched.resolveScore, enriched.workflowScore, "resolveScore === workflowScore");
  assertEq(enriched.valueScore, enriched.valueIndex, "valueScore === valueIndex");
  assert(enriched.scoreBreakdown !== undefined, "scoreBreakdown present");
  assert(enriched.scoreConfidence !== undefined, "scoreConfidence present");
  assert(Array.isArray(enriched.redFlags), "redFlags is array");
  assert(Array.isArray(enriched.warnings), "warnings is array");
}

// ─── Summary ───
console.log(`\n${"═".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"═".repeat(50)}`);
process.exit(failed > 0 ? 1 : 0);
