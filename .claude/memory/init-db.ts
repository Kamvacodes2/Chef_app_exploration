#!/usr/bin/env bun
/**
 * Initialize agent_memory.db from schema.sql.
 * Run from repo root: bun run .claude/memory/init-db.ts
 */
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const __dir = import.meta.dir;
const dbPath = join(__dir, "agent_memory.db");
const schemaPath = join(__dir, "schema.sql");

const schema = readFileSync(schemaPath, "utf-8");
const db = new Database(dbPath);
db.exec(schema);
db.close();
console.log("Created", dbPath);
