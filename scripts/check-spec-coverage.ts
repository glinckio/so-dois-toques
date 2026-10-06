import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { extractCriteria, extractStatus, findUncoveredCriteria } from "./spec-coverage";

function walk(dir: string, accept: (path: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name === "generated") return [];
    return statSync(path).isDirectory() ? walk(path, accept) : accept(path) ? [path] : [];
  });
}

const specs = walk("specs", (path) => path.endsWith("spec.md"));
const tests = [
  ...walk("src", (path) => /\.test\.tsx?$/.test(path)),
  ...walk("e2e", (path) => /\.spec\.ts$/.test(path)),
].map((path) => readFileSync(path, "utf8"));

let failed = false;
for (const spec of specs) {
  const text = readFileSync(spec, "utf8");
  const status = extractStatus(text);
  if (status !== "implementada") {
    console.log(`${spec}: status "${status}", testes ainda não exigidos`);
    continue;
  }
  const criteria = extractCriteria(text);
  const missing = findUncoveredCriteria(criteria, tests);
  if (missing.length > 0) {
    failed = true;
    console.error(`${spec}: critérios sem teste: ${missing.join(", ")}`);
  } else {
    console.log(`${spec}: ${criteria.length} critérios, todos cobertos ou manuais`);
  }
}

process.exit(failed ? 1 : 0);
