#!/usr/bin/env bun
/**
 * postToolUse hook: record successful tool use for learning (optional).
 * Reads JSON from stdin, outputs {} to stdout. No output fields required.
 */
import { closeDb } from "./lib/memory-db.ts";

interface PostToolUseInput {
  tool_name?: string;
  tool_input?: unknown;
  tool_output?: string;
  duration?: number;
}

async function main(): Promise<void> {
  try {
    const raw = new TextDecoder().decode(await Bun.stdin.arrayBuffer());
    if (!raw.trim()) {
      output();
      return;
    }
    const _input = JSON.parse(raw) as PostToolUseInput;
    // Optional: link successful runs to prior error_fixes to bump success_count
    // For now we only record on failure (capture-error) and analyze at stop.
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
