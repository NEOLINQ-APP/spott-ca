// nitro's "vercel" preset traces server output with a vendored copy of
// @vercel/nft (shipped inside the `nf3` package, under a nested
// node_modules dir). That vendored bundle is minified with `!0` instead of
// the literal `true` for `enumerable` in its `Object.defineProperty(exports,
// "nodeFileTrace", { enumerable: !0, get: ... })` call — Node's static
// cjs-module-lexer (used for `import { nodeFileTrace } from "@vercel/nft"`)
// only recognizes the literal `true` token, so it silently drops
// `nodeFileTrace` from the detected named exports. The build then fails on
// Vercel with: "The requested module '@vercel/nft' does not provide an
// export named 'nodeFileTrace'". Confirmed still present in nf3@0.3.24 /
// nitro@3.0.260903-beta (the latest at time of writing), so this can't be
// fixed by bumping the dependency — patch the vendored file after install.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const TARGET = join("@vercel", "nft", "out", "index.js");

function findMatches(dir, depth) {
  if (depth > 8) return [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const matches = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      matches.push(...findMatches(full, depth + 1));
    } else if (full.endsWith(TARGET)) {
      matches.push(full);
    }
  }
  return matches;
}

let patched = 0;
try {
  const root = join(process.cwd(), "node_modules");
  statSync(root);
  for (const filePath of findMatches(root, 0)) {
    const src = readFileSync(filePath, "utf8");
    if (!src.includes("enumerable:!0")) continue;
    writeFileSync(filePath, src.replaceAll("enumerable:!0", "enumerable:true"));
    patched++;
  }
} catch {
  // node_modules missing or unreadable — nothing to patch
}

if (patched > 0) {
  console.log(`[fix-vendored-nft] patched ${patched} vendored @vercel/nft bundle(s)`);
}
