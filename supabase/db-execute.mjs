/**
 * Concatenate all SQL migrations into one file for execution
 *
 * Usage:
 *   node supabase/db-execute.mjs --all      → outputs combined SQL to stdout
 *   node supabase/db-execute.mjs --pending  → outputs only non-schema migrations
 *   node supabase/db-execute.mjs file.sql   → outputs that file
 *
 * Pipe to clipboard: node supabase/db-execute.mjs --all | clip  (Windows)
 */

import { readFileSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ALL_MIGRATIONS = [
  "schema.sql",
  "admin-policies.sql",
  "navigation-migration.sql",
  "admin-actions.sql",
  "performance.sql",
  "staff-system.sql",
  "fix-delete-policy.sql",
  "fix-4-priorities.sql",
];

// Post-schema only (for existing databases)
const PENDING_MIGRATIONS = [
  "admin-policies.sql",
  "navigation-migration.sql",
  "admin-actions.sql",
  "performance.sql",
  "staff-system.sql",
  "fix-delete-policy.sql",
  "fix-4-priorities.sql",
];

function readFile(name) {
  try {
    return readFileSync(resolve(__dirname, name), "utf-8");
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage:");
  console.error("  node supabase/db-execute.mjs --all");
  console.error("  node supabase/db-execute.mjs --pending");
  console.error("  node supabase/db-execute.mjs <file.sql>");
  console.error("");
  console.error("Pipe to SQL Editor: node supabase/db-execute.mjs --pending | clip");
  process.exit(0);
}

const list = args[0] === "--all" ? ALL_MIGRATIONS
  : args[0] === "--pending" ? PENDING_MIGRATIONS
  : args;

const output = [];

output.push("-- ============================================================");
output.push("-- The Quest — Combined SQL migrations");
output.push(`-- Generated: ${new Date().toISOString()}`);
output.push("-- ============================================================\n");

for (const name of list) {
  const path = name.startsWith("/") || name.includes(":") ? name : name;
  const sql = readFile(path);
  if (sql) {
    output.push(`-- ─── ${basename(path)} ───────────────────────────────────`);
    output.push(sql);
    output.push("");
  } else {
    output.push(`-- ⏭️ ${path} — not found\n`);
  }
}

// Print to stdout
process.stdout.write(output.join("\n"));
