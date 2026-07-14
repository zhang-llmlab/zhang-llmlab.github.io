#!/usr/bin/env node
// Ad-hoc test runner. No new deps. Run with: node scripts/test-lib.mjs
//
// Node <22 cannot import `.ts` files directly. We use esbuild (already installed
// transitively via astro/pagefind) to transpile the three lib files into a tmp
// ESM bundle, then dynamic-import it. Zero new dependencies.
import assert from "node:assert/strict";
import { build } from "esbuild";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const libDir = join(__dirname, "..", "src", "lib");

// Bundle the three lib files into one ESM module in a tmp dir.
const outDir = mkdtempSync(join(tmpdir(), "test-lib-"));
const entryPath = join(outDir, "entry.ts");
writeFileSync(
  entryPath,
  `export { excerpt } from ${JSON.stringify(join(libDir, "text.ts"))};
export { readingTime } from ${JSON.stringify(join(libDir, "reading-time.ts"))};
export { SERIES_META } from ${JSON.stringify(join(libDir, "series-meta.ts"))};
`
);
const outFile = join(outDir, "bundle.mjs");
await build({
  entryPoints: [entryPath],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  outfile: outFile,
  logLevel: "silent"
});

const mod = await import(pathToFileURL(outFile).href);
const { excerpt, readingTime, SERIES_META } = mod;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("excerpt()");
test("returns empty string on undefined", () => {
  assert.equal(excerpt(undefined), "");
});
test("returns empty string on empty", () => {
  assert.equal(excerpt(""), "");
});
test("strips table pipes and separator rows", () => {
  const s = excerpt("| 框架 | 定位 | 特点 | | --------------------- | ---------------------- |");
  assert.ok(!s.includes("|"), `pipes not stripped: ${s}`);
  assert.ok(!s.includes("---"), `separator not stripped: ${s}`);
  assert.ok(s.includes("框架"), `content lost: ${s}`);
});
test("strips blockquote markers", () => {
  assert.equal(excerpt("> 作为 Agent 开发工程师视角的思考"), "作为 Agent 开发工程师视角的思考");
});
test("strips bold/italic asterisks", () => {
  assert.equal(excerpt("**Harness** 是包裹在 **LLM** 外面"), "Harness 是包裹在 LLM 外面");
});
test("preserves link anchor text, drops URL", () => {
  assert.equal(excerpt("参见 [文档](https://example.com) 章节"), "参见 文档 章节");
});
test("drops images entirely", () => {
  assert.equal(excerpt("前 ![alt](/img.png) 后"), "前  后".replace(/\s+/g, " ").trim());
});
test("collapses whitespace", () => {
  assert.equal(excerpt("a    b\n\n\tc"), "a b c");
});
test("truncates and adds ellipsis at 120 chars by default", () => {
  const long = "字".repeat(200);
  const out = excerpt(long);
  assert.equal(out.length, 121, `got ${out.length}`);
  assert.ok(out.endsWith("…"));
});
test("custom maxLen", () => {
  assert.equal(excerpt("字字字字字", 3), "字字字…");
});

console.log("readingTime()");
test("returns 1 for empty body", () => {
  assert.equal(readingTime(""), 1);
});
test("300 Chinese chars = 1 min", () => {
  assert.equal(readingTime("字".repeat(300)), 1);
});
test("900 Chinese chars = 3 min", () => {
  assert.equal(readingTime("字".repeat(900)), 3);
});
test("250 English words = 1 min", () => {
  assert.equal(readingTime(Array(250).fill("hello").join(" ")), 1);
});
test("mixed Chinese + English rounds up", () => {
  // 300 zh (1 min) + 250 en (1 min) = 2 min
  const body = "字".repeat(300) + " " + Array(250).fill("hello").join(" ");
  assert.equal(readingTime(body), 2);
});

console.log("SERIES_META");
test("has all 6 series keys", () => {
  const expected = ["langgraph", "pytorch", "ml-basics", "agent-dev", "skills", "harness"];
  for (const k of expected) {
    assert.ok(SERIES_META[k], `missing key: ${k}`);
    assert.ok(SERIES_META[k].title, `missing title for: ${k}`);
  }
});
test("titles are Chinese human-readable", () => {
  // spec §6.4 canonical titles
  assert.equal(SERIES_META.langgraph.title, "LangGraph 与智能体应用");
  assert.equal(SERIES_META.pytorch.title, "PyTorch 深度学习基础");
  assert.equal(SERIES_META["ml-basics"].title, "机器学习基础");
  assert.equal(SERIES_META["agent-dev"].title, "Agent 开发实践");
  assert.equal(SERIES_META.skills.title, "Skills 协议");
  assert.equal(SERIES_META.harness.title, "Harness 工程");
});

console.log(`\n${passed} passed`);
process.exit(process.exitCode ?? 0);
