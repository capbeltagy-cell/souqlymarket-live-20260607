import { readFile } from "node:fs/promises";

const baseUrl = (process.env.ROUTE_CRAWL_BASE_URL || "http://127.0.0.1:4173").replace(/\/+$/, "");
const routeTree = await readFile(new URL("../src/routeTree.gen.ts", import.meta.url), "utf8");
const routes = [
  ...new Set(
    [...routeTree.matchAll(/fullPath:\s*'([^']+)'/g)]
      .map((match) => match[1])
      .filter((path) => !path.includes("$") && !path.includes("*")),
  ),
].sort();

const results = [];
for (const path of routes) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  results.push({ path, status: response.status });
}

const failures = results.filter(({ status }) => !(status >= 200 && status < 400));
const summary = results.reduce((counts, result) => {
  counts[result.status] = (counts[result.status] || 0) + 1;
  return counts;
}, {});

console.log(JSON.stringify({ failures, routes: results.length, statuses: summary }, null, 2));
if (failures.length) process.exit(1);
