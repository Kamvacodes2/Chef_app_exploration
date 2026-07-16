#!/usr/bin/env bun
/**
 * afterFileEdit hook: learn from file edits (e.g. prefer const over let, style patterns).
 * Reads JSON from stdin: { edits: [{ file_path, old_string, new_string }] }.
 * Output: {} (no output fields required).
 */
import { insertLearnedInstinct, closeDb } from "./lib/memory-db.ts";

interface FileEdit {
  file_path?: string;
  old_string?: string;
  new_string?: string;
}

interface AfterFileEditInput {
  edits?: FileEdit[];
}

function detectPattern(oldStr: string, newStr: string): { trigger: string; action: string } | null {
  const o = oldStr.trim();
  const n = newStr.trim();
  if (!o || !n) return null;
  // Prefer const over let
  if (/^\s*let\s+\w+\s*=/.test(o) && /^\s*const\s+\w+\s*=/.test(n))
    return { trigger: "declaring variable with let", action: "Use const instead of let when not reassigned" };
  // Prefer async/await style
  if (/.then\s*\(/.test(o) && /await\s+/.test(n))
    return { trigger: "using .then()", action: "Prefer async/await over .then()" };
  return null;
}

async function main(): Promise<void> {
  try {
    const raw = new TextDecoder().decode(await Bun.stdin.arrayBuffer());
    if (!raw.trim()) {
      output();
      return;
    }
    const input = JSON.parse(raw) as AfterFileEditInput;
    const edits = input.edits ?? [];
    for (const edit of edits) {
      const oldStr = edit.old_string ?? "";
      const newStr = edit.new_string ?? "";
      const pattern = detectPattern(oldStr, newStr);
      if (pattern)
        insertLearnedInstinct({
          trigger: pattern.trigger,
          action: pattern.action,
          domain: "code_style",
          confidence: 0.5,
          evidence: `edit in ${edit.file_path ?? "?"}`,
        });
    }
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
