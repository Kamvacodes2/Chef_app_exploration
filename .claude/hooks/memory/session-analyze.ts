#!/usr/bin/env bun
/**
 * stop hook: analyze session and optionally update learned instincts.
 * Input: { status, loop_count }. Output: {} (no followup_message by default).
 */
import { closeDb } from "./lib/memory-db.ts";

interface StopInput {
  status?: string;
  loop_count?: number;
}

async function main(): Promise<void> {
  try {
    const raw = new TextDecoder().decode(await Bun.stdin.arrayBuffer());
    if (!raw.trim()) {
      output();
      return;
    }
    const _input = JSON.parse(raw) as StopInput;
    // Optional: aggregate error_patterns from this session, cluster, create learned_instincts
    // For now we only persist errors in capture-error; session-analyze is a no-op.
  } catch {
    // ignore
  } finally {
    closeDb();
  }
  output();
}

function output(): void {
  console.log(JSON.stringify({}));
}

await main();
