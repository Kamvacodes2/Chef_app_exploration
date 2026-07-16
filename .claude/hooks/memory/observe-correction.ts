#!/usr/bin/env bun
/**
 * beforeSubmitPrompt hook: observe user corrections ("actually use X", "fix to Y") and learn.
 * Reads JSON from stdin: { prompt: string }. Output: { continue: true } to allow prompt through.
 */
import { insertLearnedInstinct, closeDb } from "./lib/memory-db.ts";

interface BeforeSubmitPromptInput {
  prompt?: string;
}

function extractCorrection(prompt: string): { trigger: string; action: string } | null {
  const p = prompt.trim();
  const actuallyMatch = p.match(/^actually\s*[,:]?\s*(.+)/i);
  if (actuallyMatch)
    return { trigger: "user correction", action: actuallyMatch[1].slice(0, 300) };
  const fixMatch = p.match(/^(?:fix|change to|use)\s+(.+)/i);
  if (fixMatch)
    return { trigger: "user correction", action: fixMatch[1].slice(0, 300) };
  const insteadMatch = p.match(/use\s+(.+?)\s+instead/i);
  if (insteadMatch)
    return { trigger: "user correction", action: `Use ${insteadMatch[1].trim()} instead` };
  return null;
}

async function main(): Promise<void> {
  let continuePrompt = true;
  try {
    const raw = new TextDecoder().decode(await Bun.stdin.arrayBuffer());
    if (!raw.trim()) {
      output(continuePrompt);
      return;
    }
    const input = JSON.parse(raw) as BeforeSubmitPromptInput;
    const prompt = input.prompt ?? "";
    const correction = extractCorrection(prompt);
    if (correction)
      insertLearnedInstinct({
        trigger: correction.trigger,
        action: correction.action,
        domain: "user_correction",
        confidence: 0.7,
        evidence: prompt.slice(0, 200),
      });
  } catch {
    // ignore
  } finally {
    closeDb();
  }
  output(continuePrompt);
}

function output(continuePrompt: boolean): void {
  console.log(JSON.stringify({ continue: continuePrompt }));
}

await main();
