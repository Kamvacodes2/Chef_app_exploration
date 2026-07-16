#!/usr/bin/env bun
/**
 * postToolUseFailure hook: capture errors and store in agent memory for self-healing.
 * Reads JSON from stdin (error_message, failure_type, tool_name, tool_input).
 * Output: {} (no output fields supported for this hook).
 */
import {
  insertErrorPattern,
  getErrorFixesForMessage,
  insertErrorFix,
  closeDb,
} from "./lib/memory-db.ts";

interface PostToolUseFailureInput {
  tool_name?: string;
  tool_input?: { command?: string };
  error_message?: string;
  failure_type?: string;
  duration?: number;
}

async function main(): Promise<void> {
  let input: PostToolUseFailureInput = {};
  try {
    const raw = new TextDecoder().decode(await Bun.stdin.arrayBuffer());
    if (!raw.trim()) {
      output();
      return;
    }
    input = JSON.parse(raw) as PostToolUseFailureInput;
  } catch {
    output();
    return;
  }

  const message = input.error_message ?? "";
  if (!message) {
    output();
    return;
  }

  try {
    // Normalize common Supabase/Postgres column-not-found errors for matching
    const errorType = message.includes("column") && message.includes("does not exist")
      ? "column_not_found"
      : "error";

    const patternId = insertErrorPattern({
      error_type: errorType,
      error_message: message,
      context: input.tool_input?.command?.slice(0, 500),
      tool_name: input.tool_name ?? undefined,
    });

    // If we don't have a fix yet for this pattern, add a placeholder for known cases
    const existingFixes = getErrorFixesForMessage(message);
    if (existingFixes.length === 0) {
      if (message.includes("scraped_files.validated")) {
        insertErrorFix({
          error_pattern_id: patternId,
          fix_description: "Use validation_status instead of validated for scraped_files table",
          fix_code: "validation_status=eq.validated",
          confidence: 0.9,
        });
      } else if (message.includes("extractions.doc_type")) {
        insertErrorFix({
          error_pattern_id: patternId,
          fix_description: "extractions table has no doc_type column; use status, scraped_file_id, etc.",
          fix_code: "select=id,scraped_file_id,status,created_at",
          confidence: 0.9,
        });
      }
    }
  } finally {
    closeDb();
  }

  output();
}

function output(): void {
  console.log(JSON.stringify({}));
}

await main();
