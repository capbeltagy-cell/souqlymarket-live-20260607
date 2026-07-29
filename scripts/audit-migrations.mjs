import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const directory = new URL("../supabase/migrations/", import.meta.url);
const files = (await readdir(directory))
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

const errors = [];
const timestamps = new Map();
for (const file of files) {
  const timestamp = file.split("_", 1)[0];
  if (timestamps.has(timestamp)) {
    errors.push(
      `Duplicate migration timestamp: ${timestamp} (${timestamps.get(timestamp)}, ${file})`,
    );
  }
  timestamps.set(timestamp, file);

  const sql = await readFile(join(directory.pathname, file), "utf8");
  const withoutComments = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
  const destructive = [
    [/\bDROP\s+(?:TABLE|SCHEMA|DATABASE)\b/i, "DROP TABLE/SCHEMA/DATABASE"],
    [/\bTRUNCATE\b/i, "TRUNCATE"],
    [/\bDELETE\s+FROM\b/i, "DELETE FROM"],
  ];
  for (const [pattern, label] of destructive) {
    if (pattern.test(withoutComments)) errors.push(`${file}: prohibited ${label}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  `Migration safety audit passed: ${files.length} ordered files, no destructive data DDL.`,
);
