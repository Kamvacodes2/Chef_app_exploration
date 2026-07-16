#!/usr/bin/env bun
/**
 * preToolUse hook: validate Shell commands against known error patterns and apply fixes.
 * Reads JSON from stdin, outputs { decision, reason?, updated_input? } to stdout.
 */
import { getErrorFixesForMessage, closeDb } from "./lib/memory-db.ts";

interface PreToolUseInput {
  tool_name?: string;
  tool_input?: { command?: string; working_directory?: string };
  hook_event_name?: string;
}

interface PreToolUseOutput {
  decision: "allow" | "deny";
  reason?: string;
  updated_input?: { command?: string; working_directory?: string };
}

async function main(): Promise<void> {
  let input: PreToolUseInput = {};
  try {
    const raw = new TextDecoder().decode(await Bun.stdin.arrayBuffer());
    if (!raw.trim()) {
      output({ decision: "allow" });
      return;
    }
    input = JSON.parse(raw) as PreToolUseInput;
  } catch {
    output({ decision: "allow" });
    return;
  }

  if (input.tool_name !== "Shell" || !input.tool_input?.command) {
    output({ decision: "allow" });
    return;
  }

  const command = input.tool_input.command;
  let updatedCommand: string | null = null;

  try {
    // Check for known bad column patterns (Supabase REST)
    if (command.includes("validated=eq") || command.includes("validated=")) {
      const fixes = getErrorFixesForMessage("column scraped_files.validated does not exist");
      if (fixes.length > 0 && fixes[0].fix_code) {
        updatedCommand = command.replace(/validated=eq\./g, "validation_status=eq.");
        updatedCommand = updatedCommand!.replace(/\bvalidated=/g, "validation_status=");
      }
    }
    if ((command.includes("doc_type=") || command.includes("doc_type,") || command.includes(",doc_type")) && (command.includes("extractions") || command.includes("/rest/v1/extractions"))) {
      const fixesDoc = getErrorFixesForMessage("column extractions.doc_type does not exist");
      if (fixesDoc.length > 0) {
        updatedCommand = (updatedCommand ?? command)
          .replace(/,doc_type/g, "")
          .replace(/doc_type,/g, "")
          .replace(/doc_type/g, "")
          .replace(/[?&]doc_type=[^&\s]*/g, "");
      }
    }

    if (updatedCommand && updatedCommand !== command) {
      const result = {
        decision: "allow" as const,
        reason: "Applied known fix from agent memory (self-healing).",
        updated_input: { ...input.tool_input, command: updatedCommand },
      };
      output(result);
      return;
    }
  } finally {
    closeDb();
  }

  output({ decision: "allow" });
}

function output(result: PreToolUseOutput): void {
  console.log(JSON.stringify(result));
}

await main();
