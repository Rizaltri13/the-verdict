// Entry program for the make.fun coin promo bounty (makefun-coin-promo-01).
//
// The coin itself was THE VERDICT ($VERDICT), launched on pump.fun by the agent; this program's only
// job at grade time is to copy the repository's LAUNCH.json (the coin's mint
// and the base58 signature of the transaction that created it) to /output,
// where the scorer reads it. Node.js standard library only; no network.
//
// Before copying it validates the file so a malformed entry fails loudly
// instead of silently grading as invalid: the mint must be a base58 Solana
// address (32 to 44 characters) and the create signature a base58 Solana
// transaction signature (64 to 88 characters) or a key (32 to 44 characters),
// the same shapes the competition gate checks.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "LAUNCH.json");
const outputDir = process.env.OUTPUT_DIR ?? "/output";
const target = join(outputDir, "LAUNCH.json");

if (!existsSync(source)) {
  fail(`LAUNCH.json not found next to main.ts (${source})`);
}

let parsed: unknown;
try {
  parsed = JSON.parse(readFileSync(source, "utf8"));
} catch (error) {
  fail(`LAUNCH.json is not valid JSON: ${(error as Error).message}`);
}
const record = parsed as Record<string, unknown>;
const mint = record.mint;
const createSignature = record.create_signature;
if (typeof mint !== "string" || mint.length < 32 || mint.length > 44 || !BASE58.test(mint)) {
  fail("LAUNCH.json mint must be a base58 Solana address (32 to 44 characters)");
}
if (
  typeof createSignature !== "string" ||
  !BASE58.test(createSignature) ||
  !(
    (createSignature.length >= 64 && createSignature.length <= 88) ||
    (createSignature.length >= 32 && createSignature.length <= 44)
  )
) {
  fail("LAUNCH.json create_signature must be a base58 Solana transaction signature (64 to 88 characters) or a key (32 to 44 characters)");
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(source, target);
console.log(`copied ${source} -> ${target}`);
console.log(`validated mint ${mint} and create signature ${createSignature.slice(0, 8)}...`);

// Round-trip check: read the file we just wrote back, parse it again, and
// confirm its contents are byte-for-byte identical to the source so a
// truncated or corrupted copy can never grade as a different coin.
const copiedBytes = readFileSync(target);
let copied: unknown;
try {
  copied = JSON.parse(copiedBytes.toString("utf8"));
} catch (error) {
  fail(`copied LAUNCH.json at ${target} is not valid JSON: ${(error as Error).message}`);
}
const copiedRecord = copied as Record<string, unknown>;
if (copiedRecord.mint !== mint || copiedRecord.create_signature !== createSignature) {
  fail(
    `round-trip mismatch: copied LAUNCH.json does not match source (mint ${copiedRecord.mint} vs ${mint})`,
  );
}
console.log(`verified round-trip: ${copiedBytes.length} bytes, mint and create signature identical`);
