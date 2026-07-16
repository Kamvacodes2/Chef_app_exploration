#!/usr/bin/env bun
/**
 * afterAgentResponse hook: record that agent responded (for session analysis).
 * Reads JSON from stdin. Output: {}. No persistence here; session-analyze at stop can aggregate.
 */
import { closeDb } from "./lib/memory-db.ts";

async function main(): Promise<void> {
  try {
    const raw = new TextDecoder().decode(await Bun.stdin.arrayBuffer());
    if (raw.trim()) {
      const _input = JSON.parse(raw);
      // Optional: store response summary for pattern analysis at stop
    }
  } catch {
    // ignore
  } finally {
    closeDb();
  }
  console.log(JSON.stringify({}));
}

await main();
