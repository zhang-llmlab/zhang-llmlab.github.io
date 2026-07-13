#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, dirname } from "node:path";

const POSTS_DIR = "src/content/posts";
const PUBLIC_DIR = "public";
const errors = [];

function fail(file, msg) {
  errors.push(`[${file}] ${msg}`);
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".mdx")) out.push(full);
  }
  return out;
}

function parseFrontmatter(src) {
  const m = src.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v.startsWith("[")) {
      // Rough array parse; good enough for tag/audience/keywords
      fm[k] = v
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (/^\d+$/.test(v)) {
      fm[k] = Number(v);
    } else {
      fm[k] = v.replace(/^["']|["']$/g, "");
    }
  }
  return fm;
}

const files = await walk(POSTS_DIR);
const bySeries = new Map();
const seenSlugs = new Map();

for (const file of files) {
  const src = await readFile(file, "utf8");
  const fm = parseFrontmatter(src);
  if (!fm) {
    fail(file, "缺少 frontmatter");
    continue;
  }

  // slug 唯一性
  const slug = relative(POSTS_DIR, file).replace(/\.mdx$/, "");
  if (seenSlugs.has(slug)) {
    fail(file, `slug 冲突：${slug} 与 ${seenSlugs.get(slug)} 相同`);
  } else {
    seenSlugs.set(slug, file);
  }

  // series/seriesOrder 成对（zod 已保证，这里双保险）
  const hasSeries = fm.series !== undefined && fm.series !== "";
  const hasOrder = fm.seriesOrder !== undefined;
  if (hasSeries !== hasOrder) {
    fail(file, `series 与 seriesOrder 必须同时存在或缺失（series=${fm.series} order=${fm.seriesOrder}）`);
  }

  // 累加 series 分组
  if (hasSeries && hasOrder) {
    if (!bySeries.has(fm.series)) bySeries.set(fm.series, []);
    bySeries.get(fm.series).push({ file, order: fm.seriesOrder });
  }

  // cover 存在
  if (fm.cover && fm.cover.startsWith("/")) {
    const p = join(PUBLIC_DIR, fm.cover);
    try {
      await stat(p);
    } catch {
      fail(file, `cover 图不存在：${fm.cover} → ${p}`);
    }
  }

  // 内文相对图片存在（正则匹配 ![...](./xxx.ext)）
  const imgs = [...src.matchAll(/!\[[^\]]*\]\((\.\/[^)]+)\)/g)];
  for (const [, ref] of imgs) {
    const abs = join(dirname(file), ref);
    try {
      await stat(abs);
    } catch {
      fail(file, `内文图片引用不存在：${ref} → ${abs}`);
    }
  }
}

// 每 series 的 seriesOrder 必须是 1..N 连号且不重复
for (const [series, items] of bySeries) {
  const orders = items.map((i) => i.order).sort((a, b) => a - b);
  const expected = orders.map((_, i) => i + 1);
  if (JSON.stringify(orders) !== JSON.stringify(expected)) {
    const filesList = items.map((i) => `\n    - ${i.file} (order=${i.order})`).join("");
    fail(
      series,
      `series="${series}" 的 seriesOrder 不是连续的 1..${orders.length}：实际 [${orders.join(", ")}]${filesList}`
    );
  }
}

if (errors.length) {
  console.error(`\n❌ 内容 lint 失败：${errors.length} 个问题\n`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log(`✓ ${files.length} 篇文章、${bySeries.size} 个 series，无 lint 错误`);
