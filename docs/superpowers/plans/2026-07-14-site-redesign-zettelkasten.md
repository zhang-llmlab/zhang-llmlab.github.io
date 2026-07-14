# Site Redesign · Zettelkasten POV · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全站视觉与信息架构重构 —— 从"通用 tech-blog 模板"转成"笔记者的公开卡片盒"（Zettelkasten）：新配色 Ink & Phosphor、JetBrains Mono 识别信号、删 hero、统一 NoteRow 卡片语言、加 CategoryTabs + /tags 总览、阅读时长、Sidebar 去卡片外壳。

**Architecture:** Astro + MDX 单页面静态站；不改路由不改内容集合 schema；新增 `src/lib/*.ts` 三个纯 TS 工具函数（excerpt sanitizer / series metadata / reading time）和 4 个共享 Astro 组件（NoteRow / SiteHeader / SiteFooter / CategoryTabs）；用 CSS 变量做完整 palette 迁移，保留旧变量名作为别名以支持增量迁移。

**Tech Stack:** Astro 5.6, MDX, TypeScript, JetBrains Mono via Google Fonts, Pagefind (已有), zod content collections (已有)。**无新增运行时依赖**（typed.js 将被卸载）。

## Global Constraints

- **不改**：路由、`src/content/**`、`src/content/config.ts`、`scripts/lint-content.mjs`、`astro.config.mjs`、`.github/workflows/deploy.yml`（除 §Task 1 加一步 test-lib）、`public/images/main_page_images/**`（无备份，禁删）
- **配色**：全部 OKLCH，dark + light 双主题都必须换过；对比度校验 body ≥ 4.5:1
- **字体**：Latin 面加 JetBrains Mono 400/500/600；中文栈保持不变；`display=swap`
- **每 commit 前**：`npm run build` + `node scripts/lint-content.mjs` + `node scripts/test-lib.mjs`（Task 1 后可用）三绿；`npm run preview` 抽验关键路由 200
- **每 commit 后停下**：把 preview URL / 抽验结果报给用户；用户 review 视觉后放行下一步；不擅自继续
- **视觉基线**：committed dark palette 陶土 + 松花青，未经用户确认不得改色
- **命名一致**：新 lib 函数名固定为 `excerpt(raw, maxLen?)`、`readingTime(body)`、`SERIES_META[slug].title / .description`；组件文件名固定为 `NoteRow` / `SiteHeader` / `SiteFooter` / `CategoryTabs`

## Progress Ledger

After each task's commit lands (build + lint + test-lib green), append one line to `.superpowers/sdd/progress.md`:
```
Task N: complete (commits <base7>..<head7>, review clean)
```

---

## Task 1 — Tokens & 字体基础 & Lib 工具函数

**Files:**
- Modify: `src/styles/global.css` (rewrite the `:root` and `html[data-theme="light"]` blocks; keep other rules)
- Modify: `src/layouts/BaseLayout.astro` (Google Fonts `<link>` 换成只加载 JetBrains Mono + Noto Sans SC)
- Create: `src/lib/text.ts` (excerpt sanitizer)
- Create: `src/lib/series-meta.ts` (SERIES_META map)
- Create: `src/lib/reading-time.ts` (readingTime function)
- Create: `scripts/test-lib.mjs` (ad-hoc Node test runner for the 3 lib functions)
- Modify: `.github/workflows/deploy.yml` (add "Test lib" step before Build)

**Interfaces (produced by this task):**
- `excerpt(raw: string | undefined, maxLen?: number = 120): string` — strip markdown syntax + collapse whitespace + truncate + ellipsis
- `readingTime(body: string): number` — return integer minutes (min 1); Chinese 300 chars/min, English 250 words/min
- `SERIES_META: Record<string, { title: string; description?: string }>` — 6 entries fixed: langgraph / pytorch / ml-basics / agent-dev / skills / harness
- CSS custom properties: `--bg`, `--bg-elevated`, `--bg-soft`, `--ink`, `--ink-soft`, `--ink-mute`, `--accent`, `--accent-soft`, `--accent-line`, `--link`, `--link-hover`, `--line`, `--line-strong`, `--font-sans`, `--font-mono`, `--fs-xs..--fs-2xl`, `--sp-1..--sp-8`
- Legacy aliases retained (pointing at new palette so nothing breaks mid-migration): `--text`, `--text-soft`, `--text-muted`, `--brand`, `--brand-hover`, `--brand-2`, `--accent` (already), `--card`, `--card-hover`, `--card-shine`, `--shadow-sm`, `--shadow-md`, `--radius`, `--radius-lg`, `--code-bg`, `--code-border`, `--code-inline-bg`, `--code-inline-border`, `--code-inline-fg`, `--focus`, `--ease-out`, `--content-max`, `--body-bg`, `--sidebar-*`

**Rationale for legacy aliases:** Task 2–5 progressively rewrite call sites. Aliasing keeps the site visually consistent across intermediate commits — no random black-on-black text between tasks. Task 6 removes any alias that survived unreferenced.

- [ ] **Step 1: Write the failing test for excerpt()**

Create `scripts/test-lib.mjs`:

```javascript
#!/usr/bin/env node
// Ad-hoc test runner. No new deps. Run with: node scripts/test-lib.mjs
import assert from "node:assert/strict";
import { excerpt } from "../src/lib/text.ts";
import { readingTime } from "../src/lib/reading-time.ts";
import { SERIES_META } from "../src/lib/series-meta.ts";

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
```

- [ ] **Step 2: Run test to verify it fails (lib files don't exist yet)**

Run: `node scripts/test-lib.mjs`
Expected: FAIL with "Cannot find module '../src/lib/text.ts'"

- [ ] **Step 3: Create src/lib/text.ts**

```typescript
/**
 * Sanitize a markdown description down to plain text for card excerpts.
 * - Removes fenced/inline code, images, links (preserves anchor text)
 * - Strips block markers (>, |, #, -, *, +), bold/italic asterisks, strike
 * - Removes table separator rows (--- or |---|)
 * - Collapses whitespace
 * - Truncates to maxLen with "…" suffix
 */
export function excerpt(raw: string | undefined, maxLen = 120): string {
  if (!raw) return "";
  let s = raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[>|#\-*+]+\s*/gm, "")
    .replace(/\*\*|__|~~|\*/g, "")
    .replace(/\|/g, " ")
    .replace(/^\s*-{3,}.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length > maxLen) s = s.slice(0, maxLen).trimEnd() + "…";
  return s;
}
```

- [ ] **Step 4: Create src/lib/reading-time.ts**

```typescript
/**
 * Estimate reading time in minutes for a mixed Chinese/English body.
 * - Chinese: ~300 characters per minute
 * - English: ~250 words per minute
 * - Rounds up; minimum 1 minute
 */
export function readingTime(body: string): number {
  const cn = (body.match(/[一-鿿]/g) ?? []).length;
  const en = (body.match(/[a-zA-Z]+/g) ?? []).length;
  const minutes = Math.ceil(cn / 300 + en / 250);
  return Math.max(1, minutes);
}
```

- [ ] **Step 5: Create src/lib/series-meta.ts**

```typescript
export interface SeriesMetaEntry {
  title: string;
  description?: string;
}

export const SERIES_META: Record<string, SeriesMetaEntry> = {
  langgraph: {
    title: "LangGraph 与智能体应用",
    description: "从图 / 状态 / 检查点到 Send 并行，一个完整的 Agent 工程系列。"
  },
  pytorch: {
    title: "PyTorch 深度学习基础",
    description: "从张量到自动微分再到线性回归实战。"
  },
  "ml-basics": {
    title: "机器学习基础",
    description: "概念、分类、建模流程、经典算法与训练问题。"
  },
  "agent-dev": {
    title: "Agent 开发实践",
    description: "框架选型、技术壁垒、Multi-Agent 架构。"
  },
  skills: {
    title: "Skills 协议",
    description: "Anthropic Skills 的原理、跨框架实践与理解。"
  },
  harness: {
    title: "Harness 工程",
    description: "把 LLM 变成 Agent 的运行时外壳。"
  }
};

/** Convenience: get title (Chinese) or fall back to slug. */
export function seriesTitle(slug: string | undefined | null): string {
  if (!slug) return "";
  return SERIES_META[slug]?.title ?? slug;
}

/** Convenience: get description or empty string. */
export function seriesDescription(slug: string | undefined | null): string {
  if (!slug) return "";
  return SERIES_META[slug]?.description ?? "";
}
```

- [ ] **Step 6: Run tests, verify all pass**

Run: `node scripts/test-lib.mjs`

Expected output ends with: `19 passed` (10 excerpt + 5 readingTime + 2 SERIES_META = 17… recount: excerpt has 10 tests, readingTime has 5, SERIES_META has 2, total 17 — adjust "expected" wording).

Actually the harness will report the actual count. Confirm output ends with `N passed` where N ≥ 17 and exit code is 0.

If it fails: the error message names the failing test. Fix the corresponding lib function (do not weaken the test). Do not proceed until all pass.

- [ ] **Step 7: Rewrite `:root` and `html[data-theme="light"]` blocks in src/styles/global.css**

Read the current file first. Replace the `:root { ... }` block (currently lines 1-42) and the `html[data-theme="light"] { ... }` block (currently lines 44-80) with the following. Preserve everything from line 82 (the `*, *::before, *::after` reset) onward untouched.

New `:root` and light-theme blocks (full content):

```css
:root {
  color-scheme: dark;

  /* ── Canonical palette (Ink & Phosphor) ─────────────────── */
  --bg:          oklch(15% 0.008 245);
  --bg-elevated: oklch(19% 0.010 245);
  --bg-soft:     oklch(23% 0.012 245);

  --ink:      oklch(93% 0.015 85);
  --ink-soft: oklch(72% 0.015 85);
  --ink-mute: oklch(52% 0.012 85);

  --accent:      oklch(68% 0.14 45);
  --accent-soft: oklch(68% 0.14 45 / 0.14);
  --accent-line: oklch(68% 0.14 45 / 0.35);

  --link:       oklch(74% 0.11 195);
  --link-hover: oklch(82% 0.12 195);

  --line:        oklch(35% 0.008 245 / 0.55);
  --line-strong: oklch(45% 0.010 245 / 0.75);

  /* ── Typography ─────────────────────────────────────────── */
  --font-sans: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
               -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;

  --fs-xs:   0.78rem;
  --fs-sm:   0.88rem;
  --fs-base: 1rem;
  --fs-lg:   1.15rem;
  --fs-xl:   1.4rem;
  --fs-2xl:  clamp(1.75rem, 3vw, 2.3rem);

  /* ── Space scale (8-based) ─────────────────────────────── */
  --sp-1: 0.25rem;
  --sp-2: 0.5rem;
  --sp-3: 0.75rem;
  --sp-4: 1rem;
  --sp-5: 1.5rem;
  --sp-6: 2rem;
  --sp-7: 3rem;
  --sp-8: 4rem;

  /* ── Radii ─────────────────────────────────────────────── */
  --radius:    14px;
  --radius-lg: 18px;

  /* ── Shadows (impeccable polish kept these tight) ──────── */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.32), 0 1px 0 rgba(255, 255, 255, 0.04) inset;
  --shadow-md: 0 8px 20px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.05) inset;

  /* ── Misc ──────────────────────────────────────────────── */
  --focus:     oklch(74% 0.11 195 / 0.5);   /* link color at 50% */
  --ease-out:  cubic-bezier(0.22, 1, 0.36, 1);
  --content-max: 1800px;

  /* ── Legacy aliases (kept until Task 6 cleanup) ────────── */
  --text:          var(--ink);
  --text-soft:     var(--ink-soft);
  --text-muted:    var(--ink-mute);
  --brand:         var(--accent);
  --brand-hover:   var(--link-hover);
  --brand-2:       var(--link);
  --card:          var(--bg-elevated);
  --card-hover:    var(--bg-soft);
  --card-shine:    linear-gradient(165deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 42%);
  --code-bg:       oklch(11% 0.008 245);
  --code-border:   var(--line);
  --code-inline-bg:     var(--accent-soft);
  --code-inline-border: var(--accent-line);
  --code-inline-fg:     var(--ink);
  --body-bg: linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg) 30%, var(--bg) 100%);
  --sidebar-card-bg:      var(--bg-elevated);
  --sidebar-card-border:  var(--line);
  --sidebar-card-shadow:  var(--shadow-sm);
  --sidebar-title:        var(--ink);
  --sidebar-muted:        var(--ink-soft);
  --sidebar-divider:      var(--line);
  --sidebar-badge-bg:     var(--bg-soft);
  --sidebar-social-bg:    var(--bg-soft);
}

html[data-theme="light"] {
  color-scheme: light;

  --bg:          oklch(97% 0.005 90);
  --bg-elevated: oklch(99% 0.003 90);
  --bg-soft:     oklch(94% 0.008 90);

  --ink:      oklch(22% 0.015 245);
  --ink-soft: oklch(40% 0.015 245);
  --ink-mute: oklch(52% 0.012 245);

  --accent:      oklch(52% 0.14 40);
  --accent-soft: oklch(52% 0.14 40 / 0.10);
  --accent-line: oklch(52% 0.14 40 / 0.30);

  --link:       oklch(48% 0.12 210);
  --link-hover: oklch(40% 0.14 210);

  --line:        oklch(60% 0.008 245 / 0.30);
  --line-strong: oklch(50% 0.010 245 / 0.45);

  --shadow-sm: 0 2px 6px rgba(0, 40, 30, 0.08), 0 1px 0 rgba(255, 255, 255, 0.8) inset;
  --shadow-md: 0 6px 16px rgba(0, 40, 30, 0.1);

  --focus: oklch(48% 0.12 210 / 0.45);

  /* Legacy aliases (light mode) */
  --code-bg:       oklch(94% 0.005 90);
  --body-bg: linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg) 60%, var(--bg) 100%);
  --sidebar-card-bg:      var(--bg-elevated);
  --sidebar-card-border:  var(--line);
  --sidebar-card-shadow:  var(--shadow-sm);
  --sidebar-title:        var(--ink);
  --sidebar-muted:        var(--ink-soft);
  --sidebar-divider:      var(--line);
  --sidebar-badge-bg:     var(--bg-soft);
  --sidebar-social-bg:    var(--bg-soft);
}
```

- [ ] **Step 8: Replace Google Fonts `<link>` in src/layouts/BaseLayout.astro**

Read lines 44-49 first. The current `<link>` loads DM Sans + Inter + JetBrains Mono + Noto Sans SC. Replace with a minimal set that matches the new palette:

Old (line 46-49):
```html
<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;1,400&family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

New:
```html
<link
  href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

DM Sans and Inter are dropped (Noto Sans SC + system-ui carry the sans role).

- [ ] **Step 9: Add "Test lib" step to `.github/workflows/deploy.yml`**

Read the file. Locate the "Type-check content collections" step. Insert a new step **immediately after** it and **before** "Lint content":

```yaml
      - name: Test lib functions
        run: node scripts/test-lib.mjs
```

The final ordering in the build job should be: Install → Type-check → Test lib → Lint content → Build.

- [ ] **Step 10: Run full local verification**

```bash
node scripts/test-lib.mjs
node scripts/lint-content.mjs
npm run build
```

Expected: all three exit 0. The build output will look colorwise the same as before because legacy aliases point at new palette (the visible page STILL renders with old class names hitting `--text`, `--card` etc — but those now resolve to Ink & Phosphor OKLCH values). This is by design; visual changes intensify as later tasks migrate call sites.

- [ ] **Step 11: Sanity-check preview**

```bash
npm run preview > /tmp/preview.log 2>&1 &
sleep 3
PORT=$(grep -oE 'localhost:[0-9]+' /tmp/preview.log | head -1 | cut -d: -f2)
for u in "" "posts" "posts/langgraph/01-intro" "series" "tags/Harness"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/$u")
  echo "$code /$u"
done
kill %1 2>/dev/null; wait 2>/dev/null
```

Expected: all 200.

- [ ] **Step 12: Commit**

```bash
git add src/lib/text.ts src/lib/series-meta.ts src/lib/reading-time.ts \
        scripts/test-lib.mjs .github/workflows/deploy.yml \
        src/styles/global.css src/layouts/BaseLayout.astro
git commit -m "$(cat <<'EOF'
feat: Ink & Phosphor palette + JetBrains Mono + lib utilities

- New OKLCH palette (dark + light), replacing warm-gold with clay red
  accent, phosphor cyan links, cool-ink-blue near-black bg.
- New tokens: --ink/--bg/--accent/--link/--line + --font-sans/mono +
  --fs-xs..2xl + --sp-1..8. Legacy variable names retained as aliases
  pointing at new palette (removed in cleanup task).
- Google Fonts link trimmed to JetBrains Mono + Noto Sans SC only.
- src/lib/text.ts:excerpt() markdown sanitizer with 10 unit tests.
- src/lib/reading-time.ts:readingTime() with 5 unit tests.
- src/lib/series-meta.ts with 6 canonical entries + 2 helpers.
- scripts/test-lib.mjs ad-hoc test runner (no new deps).
- CI: add "Test lib functions" step before Build.

Legacy call sites (using --text, --card, --brand etc) still work via
aliases; visual polish will intensify as later tasks migrate to new
token names.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Do NOT push. Stop here and hand off to user for preview + review.

---

## Task 2 — Site Chrome：NoteRow / SiteHeader / SiteFooter / CategoryTabs / Nav / Sidebar / tag-chip

**Files:**
- Create: `src/components/NoteRow.astro`
- Create: `src/components/SiteHeader.astro`
- Create: `src/components/SiteFooter.astro`
- Create: `src/components/CategoryTabs.astro`
- Modify: `src/components/Nav.astro` (simplify: remove overlay variant, use new tokens, 56px height, accent-underline active)
- Modify: `src/components/Sidebar.astro` (drop card outer shell, use tag-chip, hairline dividers)
- Modify: `src/styles/global.css` (append `.tag-chip` rule under existing `.tag` — keep both; migration to `.tag-chip` happens in later tasks)
- Modify: `src/layouts/BaseLayout.astro` (mount SiteFooter for non-fullWidth pages; ensure Nav still renders)

**Interfaces (produced by this task):**

- `<NoteRow>` props:
  ```ts
  interface Props {
    slug: string;
    title: string;
    description?: string;
    pubDate: Date;
    category?: string;
    series?: string;
    seriesOrder?: number;
    tags?: string[];
    variant?: "index" | "detail";  // "index" trims to 1-line excerpt; "detail" allows 2 lines
  }
  ```

- `<SiteHeader>` props:
  ```ts
  interface Props {
    title: string;          // "zhang-llmlab"
    tagline: string;        // "记录一位工程师..."
    postCount: number;      // 33
    seriesCount: number;    // 6
    latestUpdated: Date;    // most recent pubDate/updatedDate
  }
  ```

- `<SiteFooter>` no props (reads from `SITE` config).

- `<CategoryTabs>` props:
  ```ts
  interface Props {
    categories: readonly string[];  // pass CATEGORIES enum from config.ts
    // No selectedCategory prop — filter is entirely client-side via ?category=X and JS
  }
  ```

- `.tag-chip` CSS class (see Step 8 for exact rule).

- [ ] **Step 1: Create src/components/NoteRow.astro**

```astro
---
import { excerpt } from "../lib/text";
import { seriesTitle } from "../lib/series-meta";

interface Props {
  slug: string;
  title: string;
  description?: string;
  pubDate: Date;
  category?: string;
  series?: string;
  seriesOrder?: number;
  tags?: string[];
  variant?: "index" | "detail";
}

const {
  slug,
  title,
  description,
  pubDate,
  series,
  seriesOrder,
  tags = [],
  variant = "index"
} = Astro.props;

function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const orderLabel = seriesOrder != null ? String(seriesOrder).padStart(2, "0") : "";
const seriesBadge = series ? `${series}·${orderLabel || ""}`.replace(/·$/, "") : "";
const excerptText = excerpt(description, variant === "detail" ? 180 : 120);
const displayTags = tags.slice(0, 3);
---

<a class="note-row" href={`/posts/${slug}`}>
  <div class="note-row__col-left">
    <time class="note-row__date" datetime={pubDate.toISOString()}>{formatYmd(pubDate)}</time>
  </div>
  <div class="note-row__col-right">
    <div class="note-row__head">
      <h3 class="note-row__title">{title}</h3>
      {seriesBadge && (
        <span class="note-row__series" aria-label={`专题 ${seriesTitle(series)} 第 ${orderLabel} 篇`}>
          {series}<span class="note-row__series-sep">·</span>{orderLabel}
        </span>
      )}
    </div>
    {excerptText && <p class="note-row__excerpt">{excerptText}</p>}
    {displayTags.length > 0 && (
      <div class="note-row__tags">
        {displayTags.map((t) => <span class="tag-chip">{t}</span>)}
      </div>
    )}
  </div>
</a>

<style>
  .note-row {
    display: grid;
    grid-template-columns: 6.5rem 1fr;
    gap: var(--sp-4);
    padding: var(--sp-4) 0;
    color: inherit;
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .note-row + .note-row {
    border-top: 1px solid var(--line);
  }
  .note-row:focus-visible {
    outline: 2px solid var(--link);
    outline-offset: 4px;
    border-radius: 4px;
  }
  .note-row__date {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-mute);
    font-variant-numeric: tabular-nums;
  }
  .note-row__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sp-3);
    margin-bottom: var(--sp-2);
  }
  .note-row__title {
    margin: 0;
    font-size: var(--fs-base);
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.4;
    color: var(--ink);
    text-wrap: balance;
    transition: color 0.15s ease;
  }
  .note-row:hover .note-row__title {
    color: var(--accent);
  }
  .note-row__series {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--ink-mute);
    white-space: nowrap;
  }
  .note-row__series-sep {
    color: var(--accent);
    margin: 0 1px;
  }
  .note-row__excerpt {
    margin: 0 0 var(--sp-2);
    font-size: var(--fs-sm);
    line-height: 1.55;
    color: var(--ink-soft);
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  }
  .note-row[data-variant="detail"] .note-row__excerpt,
  .note-row__excerpt[data-variant="detail"] {
    -webkit-line-clamp: 2;
  }
  .note-row__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
  }
  @media (max-width: 560px) {
    .note-row {
      grid-template-columns: 1fr;
      gap: var(--sp-1);
    }
    .note-row__head {
      flex-wrap: wrap;
    }
  }
</style>
```

- [ ] **Step 2: Create src/components/SiteHeader.astro**

```astro
---
interface Props {
  title: string;
  tagline: string;
  postCount: number;
  seriesCount: number;
  latestUpdated: Date;
}

const { title, tagline, postCount, seriesCount, latestUpdated } = Astro.props;

function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
---

<header class="site-header">
  <h1 class="site-header__title">{title}</h1>
  <div class="site-header__rule" aria-hidden="true"></div>
  <p class="site-header__tagline">{tagline}</p>
  <p class="site-header__stats">
    <span class="stat-num">{postCount}</span> 篇笔记
    <span class="dot">·</span>
    <span class="stat-num">{seriesCount}</span> 个专题
    <span class="dot">·</span>
    最后更新 <span class="stat-num">{formatYmd(latestUpdated)}</span>
  </p>
</header>

<style>
  .site-header {
    padding: var(--sp-6) 0 var(--sp-5);
    max-width: 46ch;
  }
  .site-header__title {
    margin: 0 0 var(--sp-3);
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: var(--fs-2xl);
    letter-spacing: -0.02em;
    color: var(--ink);
    line-height: 1.1;
  }
  .site-header__rule {
    width: 8em;
    height: 1px;
    background: var(--accent-line);
    margin-bottom: var(--sp-4);
  }
  .site-header__tagline {
    margin: 0 0 var(--sp-3);
    font-size: var(--fs-base);
    line-height: 1.6;
    color: var(--ink-soft);
    text-wrap: pretty;
  }
  .site-header__stats {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-mute);
  }
  .stat-num {
    color: var(--accent);
  }
  .dot {
    margin: 0 var(--sp-2);
    color: var(--ink-mute);
  }
</style>
```

- [ ] **Step 3: Create src/components/SiteFooter.astro**

```astro
---
import { SITE } from "../site.config";

const year = 2026; // Astro build is static; hard-code to match spec
const startYear = 2024;
---

<footer class="site-footer">
  <p class="site-footer__line">
    <span class="site-footer__brand">{SITE.author ?? "zhang-llmlab"}</span>
    <span class="dot">·</span>
    <span class="site-footer__years">{startYear}–{year}</span>
  </p>
  <p class="site-footer__links">
    <a href="/rss.xml">RSS</a>
    <span class="dot">·</span>
    <a href="https://github.com/zhang-llmlab/zhang-llmlab.github.io">GitHub</a>
    <span class="dot">·</span>
    <a href="/sitemap-0.xml">站点地图</a>
  </p>
</footer>

<style>
  .site-footer {
    margin-top: var(--sp-8);
    padding: var(--sp-5) 0 var(--sp-4);
    border-top: 1px solid var(--line);
    color: var(--ink-mute);
    font-size: var(--fs-xs);
  }
  .site-footer__line,
  .site-footer__links {
    margin: 0 0 var(--sp-2);
  }
  .site-footer__brand,
  .site-footer__years {
    font-family: var(--font-mono);
  }
  .site-footer .dot {
    margin: 0 var(--sp-2);
    color: var(--ink-mute);
  }
  .site-footer a {
    color: var(--ink-soft);
    font-family: var(--font-mono);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .site-footer a:hover {
    color: var(--link);
  }
  .site-footer a:focus-visible {
    outline: 2px solid var(--link);
    outline-offset: 2px;
    border-radius: 2px;
  }
</style>
```

- [ ] **Step 4: Create src/components/CategoryTabs.astro**

```astro
---
interface Props {
  categories: readonly string[];
}
const { categories } = Astro.props;
---

<nav class="cat-tabs" aria-label="按分类筛选">
  <button type="button" class="cat-tab is-active" data-cat="all">全部</button>
  {categories.map((c) => (
    <button type="button" class="cat-tab" data-cat={c}>{c}</button>
  ))}
</nav>

<script>
  function currentFilter() {
    const p = new URLSearchParams(window.location.search);
    return p.get("category") ?? "all";
  }

  function applyFilter(cat: string) {
    document.querySelectorAll<HTMLElement>("[data-post-category]").forEach((el) => {
      const c = el.dataset.postCategory ?? "";
      el.hidden = !(cat === "all" || c === cat);
    });
    document.querySelectorAll<HTMLButtonElement>(".cat-tab").forEach((btn) => {
      btn.classList.toggle("is-active", (btn.dataset.cat ?? "") === cat);
    });
    // Show empty state hint if all rows are hidden
    const anyVisible = Array.from(document.querySelectorAll<HTMLElement>("[data-post-category]")).some(
      (el) => !el.hidden
    );
    const empty = document.getElementById("cat-empty");
    if (empty) empty.hidden = anyVisible;
  }

  function init() {
    const initial = currentFilter();
    applyFilter(initial);
    document.querySelectorAll<HTMLButtonElement>(".cat-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cat = btn.dataset.cat ?? "all";
        const p = new URLSearchParams(window.location.search);
        if (cat === "all") p.delete("category");
        else p.set("category", cat);
        const qs = p.toString();
        const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        window.history.replaceState({}, "", url);
        applyFilter(cat);
      });
    });
  }

  document.addEventListener("astro:page-load", init);
  init();
</script>

<style>
  .cat-tabs {
    display: flex;
    gap: var(--sp-2);
    overflow-x: auto;
    padding-bottom: var(--sp-2);
    margin: var(--sp-4) 0 var(--sp-5);
    border-bottom: 1px solid var(--line);
    -webkit-overflow-scrolling: touch;
  }
  .cat-tab {
    flex-shrink: 0;
    padding: var(--sp-2) var(--sp-3);
    font-family: var(--font-sans);
    font-size: var(--fs-sm);
    color: var(--ink-soft);
    background: none;
    border: 0;
    border-radius: 0;
    cursor: pointer;
    position: relative;
    transition: color 0.15s ease;
  }
  .cat-tab:hover {
    color: var(--ink);
  }
  .cat-tab.is-active {
    color: var(--ink);
    font-weight: 600;
  }
  .cat-tab.is-active::after {
    content: "";
    position: absolute;
    left: var(--sp-3);
    right: var(--sp-3);
    bottom: calc(-1 * var(--sp-2) - 1px);
    height: 2px;
    background: var(--accent);
  }
  .cat-tab:focus-visible {
    outline: 2px solid var(--link);
    outline-offset: 2px;
    border-radius: 2px;
  }
</style>
```

- [ ] **Step 5: Rewrite src/components/Nav.astro (drop overlay variant, use new tokens)**

Replace the ENTIRE file with:

```astro
---
interface Props {
  currentPath?: string;
}
const { currentPath = "/" } = Astro.props;

const links = [
  { href: "/", label: "首页" },
  { href: "/posts", label: "文章" },
  { href: "/series", label: "专题" },
  { href: "/projects", label: "作品集" },
  { href: "/search", label: "搜索" }
];

function linkActive(href: string, path: string) {
  const p = path.replace(/\/$/, "") || "/";
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return p === "/";
  return p === h || p.startsWith(`${h}/`);
}
---

<nav class="site-nav" aria-label="主导航">
  <a class="site-nav__brand" href="/">
    <span class="site-nav__mark" aria-hidden="true"></span>
    <span class="site-nav__brand-text">zhang-llmlab</span>
  </a>
  <ul class="site-nav__items">
    {links.map((link) => (
      <li>
        <a
          class:list={["site-nav__link", { "is-active": linkActive(link.href, currentPath) }]}
          href={link.href}
          aria-current={linkActive(link.href, currentPath) ? "page" : undefined}
        >
          {link.label}
        </a>
      </li>
    ))}
  </ul>
</nav>

<style>
  .site-nav {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-5);
    height: 56px;
    padding: 0 clamp(var(--sp-4), 4vw, var(--sp-5));
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--line);
    margin: 0 calc(-1 * clamp(var(--sp-4), 4vw, var(--sp-5))) var(--sp-5);
  }
  .site-nav__brand {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    color: var(--ink);
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: var(--fs-sm);
    text-decoration: none;
    letter-spacing: -0.01em;
  }
  .site-nav__mark {
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: 1px;
    display: inline-block;
  }
  .site-nav__items {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .site-nav__link {
    position: relative;
    display: inline-block;
    padding: var(--sp-2) 0;
    color: var(--ink-soft);
    font-size: var(--fs-sm);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .site-nav__link:hover {
    color: var(--ink);
  }
  .site-nav__link.is-active {
    color: var(--ink);
  }
  .site-nav__link.is-active::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -2px;
    height: 2px;
    background: var(--accent);
  }
  .site-nav__link:focus-visible {
    outline: 2px solid var(--link);
    outline-offset: 4px;
    border-radius: 2px;
  }
  @media (max-width: 560px) {
    .site-nav {
      gap: var(--sp-3);
      padding: 0 var(--sp-3);
    }
    .site-nav__items {
      gap: var(--sp-3);
    }
    .site-nav__link {
      font-size: var(--fs-xs);
    }
  }
</style>
```

- [ ] **Step 6: Rewrite src/components/Sidebar.astro (drop card, use tag-chip)**

Read the current file first (should be ~229 lines with card outer + colored pills). Replace ENTIRELY with:

```astro
---
import { seriesTitle } from "../lib/series-meta";

interface Props {
  series: [string, number][];
  keywords: [string, number][];
}
const { series, keywords } = Astro.props;

const topKeywords = keywords.slice(0, 15);
const hasMoreKeywords = keywords.length > topKeywords.length;
---

<aside class="site-sidebar" aria-label="站内导航">
  <section class="side-block">
    <h2 class="side-block__title">专题</h2>
    <ul class="side-block__list">
      {series.map(([slug, count]) => (
        <li>
          <a href={`/series/${encodeURIComponent(slug)}`}>
            <span class="side-block__key">{slug}</span>
            <span class="side-block__count">{count}</span>
          </a>
        </li>
      ))}
    </ul>
  </section>

  {topKeywords.length > 0 && (
    <section class="side-block">
      <h2 class="side-block__title">热门标签</h2>
      <div class="side-block__chips">
        {topKeywords.map(([tag]) => (
          <a class="tag-chip" href={`/tags/${encodeURIComponent(tag)}`}>{tag}</a>
        ))}
      </div>
      {hasMoreKeywords && (
        <a class="side-block__more" href="/tags">更多 →</a>
      )}
    </section>
  )}
</aside>

<style>
  .site-sidebar {
    position: sticky;
    top: calc(56px + var(--sp-4));
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
    min-width: 0;
  }
  .side-block {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .side-block + .side-block {
    padding-top: var(--sp-5);
    border-top: 1px solid var(--line);
  }
  .side-block__title {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0.02em;
    color: var(--ink-mute);
  }
  .side-block__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .side-block__list a {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    color: var(--ink);
    text-decoration: none;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    padding: 2px 0;
    transition: color 0.15s ease;
  }
  .side-block__list a:hover {
    color: var(--accent);
  }
  .side-block__key {
    letter-spacing: -0.01em;
  }
  .side-block__count {
    color: var(--ink-mute);
    font-variant-numeric: tabular-nums;
  }
  .side-block__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
  }
  .side-block__more {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--link);
    text-decoration: none;
    align-self: flex-start;
  }
  .side-block__more:hover {
    color: var(--link-hover);
    text-decoration: underline;
    text-underline-offset: 4px;
  }
</style>
```

- [ ] **Step 7: Append `.tag-chip` rule to src/styles/global.css**

Read the current file. Locate the existing `.tag` block (starts around line 243 in the file — search for `.tag {`). **Do not delete `.tag`**. Append the new `.tag-chip` block immediately after it:

```css
.tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-soft);
  color: var(--ink-mute);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  line-height: 1.6;
  border: 1px solid transparent;
  text-decoration: none;
  transition: color 0.15s ease, border-color 0.15s ease;
}

a.tag-chip:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}

a.tag-chip:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 2px;
}
```

- [ ] **Step 8: Wire SiteFooter into BaseLayout.astro**

Read the file. Two edits:

**Edit A** — add import at top of frontmatter block:
```astro
import SiteFooter from "../components/SiteFooter.astro";
```

**Edit B** — wrap the non-fullWidth branch's inner content so the footer appears at the end. Locate the `fullWidth ? ... : (...)` ternary in the `<body>`. Change the non-fullWidth branch from:

```astro
<div class="container layout-page">
  <Nav currentPath={Astro.url.pathname} />
  <div class="layout-with-sidebar">
    <div class="layout-main">
      <slot />
    </div>
    <Sidebar series={sidebarData.series} keywords={sidebarData.keywords} />
  </div>
</div>
```

to:

```astro
<div class="container layout-page">
  <Nav currentPath={Astro.url.pathname} />
  <div class="layout-with-sidebar">
    <div class="layout-main">
      <slot />
    </div>
    <Sidebar series={sidebarData.series} keywords={sidebarData.keywords} />
  </div>
  <SiteFooter />
</div>
```

For the `fullWidth` branch (homepage still uses it in Task 3), also mount Nav + SiteFooter around the slot:

Change the `fullWidth ? (<slot />) : (...)` branch from:
```astro
<slot />
```
to:
```astro
<div class="container layout-page">
  <Nav currentPath={Astro.url.pathname} />
  <slot />
  <SiteFooter />
</div>
```

**Note:** After this change, `fullWidth` no longer means "no chrome" — it means "no sidebar". Homepage keeps `fullWidth=true` in Task 3 to suppress sidebar; content will be full-width main column.

- [ ] **Step 9: Verify build and preview**

```bash
node scripts/test-lib.mjs
node scripts/lint-content.mjs
npm run build
```

Expected: all pass. Then preview抽验:

```bash
npm run preview > /tmp/preview.log 2>&1 &
sleep 3
PORT=$(grep -oE 'localhost:[0-9]+' /tmp/preview.log | head -1 | cut -d: -f2)
for u in "" "posts" "posts/langgraph/01-intro" "series" "series/harness" "tags/Harness" "categories/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0" "search"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/$u")
  echo "$code /$u"
done
kill %1 2>/dev/null; wait 2>/dev/null
```

Expected: all 200.

Visual expectations (report to user for review):
- Nav is now a solid 56px bar with sans-serif menu items and a chevron underline under active page (not a floating rounded pill)
- Right sidebar is now plain: mono series list with counts, plain tag-chip cluster, hairline dividers, no card outline
- Site has a footer with mono `zhang-llmlab · 2024–2026 / RSS · GitHub · 站点地图`
- Homepage still uses old HomeHero (rewritten in Task 3) — expect some visual clash there. Fine.

- [ ] **Step 10: Commit**

```bash
git add src/components/NoteRow.astro \
        src/components/SiteHeader.astro \
        src/components/SiteFooter.astro \
        src/components/CategoryTabs.astro \
        src/components/Nav.astro \
        src/components/Sidebar.astro \
        src/styles/global.css \
        src/layouts/BaseLayout.astro
git commit -m "$(cat <<'EOF'
feat: introduce NoteRow / SiteHeader / SiteFooter / CategoryTabs + rewrite Nav & Sidebar

- NoteRow: unified list item (date · title · series badge · excerpt · tag chips)
  used across index/posts/series pages in later tasks.
- SiteHeader: name-card style header (title + accent rule + tagline + stats)
  replaces HomeHero on homepage in Task 3.
- SiteFooter: minimal mono footer, mounted globally in BaseLayout.
- CategoryTabs: horizontal tab strip with client-side ?category=X filter,
  wired to posts index in Task 4.
- Nav: dropped floating rounded overlay variant; 56px fixed bar with accent
  underline for active page.
- Sidebar: dropped card outer shell; now mono series list + tag-chip cluster
  with hairline dividers.
- global.css: added .tag-chip rule (mono, no fill); .tag legacy class retained.
- BaseLayout: mount SiteFooter for both fullWidth and default page branches.

Homepage still uses HomeHero — will be replaced in Task 3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Do NOT push. Stop and hand off to user for preview + review.

---

## Task 3 — Homepage rewrite（3-block index + delete HomeHero + uninstall typed.js）

**Files:**
- Modify: `src/pages/index.astro` (rewrite as 3-block editorial index)
- Delete: `src/components/HomeHero.astro`
- Modify: `package.json` (remove `typed.js` dependency)
- Modify: `package-lock.json` (regenerated by npm)
- Verify: `public/images/main_page_images/**` untouched

**Interfaces consumed from Task 1 & 2:**
- `<SiteHeader title, tagline, postCount, seriesCount, latestUpdated>`
- `<NoteRow slug, title, description, pubDate, series, seriesOrder, tags, variant>`
- `seriesTitle(slug)` from `src/lib/series-meta`
- Design tokens `--sp-*`, `--fs-*`, `--font-mono`, `--ink`, `--ink-soft`, `--ink-mute`, `--accent`, `--accent-line`, `--line`, `--link`

- [ ] **Step 1: Rewrite src/pages/index.astro**

Replace the ENTIRE file with:

```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../layouts/BaseLayout.astro";
import SiteHeader from "../components/SiteHeader.astro";
import NoteRow from "../components/NoteRow.astro";
import { SERIES_META } from "../lib/series-meta";
import { PROFILE } from "../site.config";

const allPosts = (await getCollection("posts")).filter((p) => !p.data.draft);

// Sort by pubDate desc for "latest 10"
const sortedByDate = [...allPosts].sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
);
const latest = sortedByDate.slice(0, 10);
const latestUpdated = sortedByDate[0]?.data.updatedDate ?? sortedByDate[0]?.data.pubDate ?? new Date();

// Build series matrix data
const seriesSlugs = Object.keys(SERIES_META);
const seriesMatrix = seriesSlugs.map((slug) => {
  const posts = allPosts
    .filter((p) => p.data.series === slug)
    .sort((a, b) => (a.data.seriesOrder ?? 999) - (b.data.seriesOrder ?? 999));
  return {
    slug,
    title: SERIES_META[slug].title,
    count: posts.length,
    topThree: posts.slice(0, 3).map((p) => ({
      slug: p.slug,
      title: p.data.title,
      order: p.data.seriesOrder
    }))
  };
});

const totalPosts = allPosts.length;
const totalSeries = seriesSlugs.length;
---

<BaseLayout title="zhang-llmlab | 首页" description="记录一位工程师的技术心智：机器学习、Agent 工程、Harness。" fullWidth>
  <div class="home-layout">
    <SiteHeader
      title="zhang-llmlab"
      tagline="记录一位工程师的技术心智：机器学习、Agent 工程、Harness。"
      postCount={totalPosts}
      seriesCount={totalSeries}
      latestUpdated={latestUpdated instanceof Date ? latestUpdated : new Date(latestUpdated)}
    />

    <section class="home-block" aria-labelledby="block-series">
      <div class="home-block__head">
        <h2 id="block-series" class="home-block__title">专题矩阵</h2>
        <a class="home-block__more" href="/series">全部专题 →</a>
      </div>
      <div class="series-grid">
        {seriesMatrix.map((s) => (
          <a class="series-cell" href={`/series/${encodeURIComponent(s.slug)}`}>
            <div class="series-cell__head">
              <span class="series-cell__slug">{s.slug}</span>
              <span class="series-cell__count">{s.count} 篇</span>
            </div>
            <div class="series-cell__rule" aria-hidden="true"></div>
            <h3 class="series-cell__title">{s.title}</h3>
            {s.topThree.length > 0 && (
              <ul class="series-cell__list">
                {s.topThree.map((p) => (
                  <li>
                    <span class="series-cell__order">
                      {p.order != null ? String(p.order).padStart(2, "0") : "··"}
                    </span>
                    <span class="series-cell__ptitle">{p.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <span class="series-cell__cta">查看专题 →</span>
          </a>
        ))}
      </div>
    </section>

    <section class="home-block" aria-labelledby="block-latest">
      <div class="home-block__head">
        <h2 id="block-latest" class="home-block__title">最新笔记</h2>
        <a class="home-block__more" href="/posts">全部 {totalPosts} 篇 →</a>
      </div>
      <div class="notes-list">
        {latest.map((p) => (
          <NoteRow
            slug={p.slug}
            title={p.data.title}
            description={p.data.description}
            pubDate={p.data.pubDate}
            category={p.data.category}
            series={p.data.series}
            seriesOrder={p.data.seriesOrder}
            tags={p.data.tags}
            variant="index"
          />
        ))}
      </div>
    </section>

    <section class="home-block about-block" aria-labelledby="block-about">
      <div class="about-card">
        <img class="about-card__avatar" src={PROFILE.avatar} alt="" width="56" height="56" />
        <div class="about-card__body">
          <p class="about-card__name">{PROFILE.name}</p>
          <p class="about-card__bio">工程师 · 记录学习、复盘、工具用法</p>
          <p class="about-card__fields">
            <span class="about-card__label">领域：</span>AI 算法<span class="dot">·</span>Agent 工程
          </p>
          <p class="about-card__links">
            {PROFILE.social.github && <a href={PROFILE.social.github}>GitHub</a>}
            {PROFILE.social.github && <span class="dot">·</span>}
            <a href="/rss.xml">RSS</a>
          </p>
        </div>
      </div>
    </section>
  </div>
</BaseLayout>

<style>
  .home-layout {
    max-width: 920px;
    margin: 0 auto;
    padding-inline: var(--sp-2);
  }

  .home-block {
    margin-top: var(--sp-7);
  }

  .home-block__head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--sp-4);
    margin-bottom: var(--sp-5);
    padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--line);
  }

  .home-block__title {
    margin: 0;
    font-size: var(--fs-xl);
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .home-block__more {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--link);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .home-block__more:hover {
    color: var(--link-hover);
  }

  /* ── Series matrix ─────────────────────────────────── */
  .series-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--sp-4);
  }
  .series-cell {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-5);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: inherit;
    text-decoration: none;
    background: var(--bg-elevated);
    transition: border-color 0.2s var(--ease-out), transform 0.2s var(--ease-out);
  }
  .series-cell:hover {
    border-color: var(--accent-line);
    transform: translateY(-2px);
  }
  .series-cell:focus-visible {
    outline: 2px solid var(--link);
    outline-offset: 3px;
  }
  .series-cell__head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
  }
  .series-cell__slug {
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .series-cell__count {
    color: var(--ink-mute);
  }
  .series-cell__rule {
    width: 2ch;
    height: 1px;
    background: var(--accent-line);
  }
  .series-cell__title {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.01em;
    line-height: 1.35;
    text-wrap: balance;
  }
  .series-cell__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .series-cell__list li {
    display: flex;
    gap: var(--sp-3);
    font-size: var(--fs-sm);
    color: var(--ink-soft);
    line-height: 1.4;
  }
  .series-cell__order {
    flex-shrink: 0;
    font-family: var(--font-mono);
    color: var(--ink-mute);
    font-variant-numeric: tabular-nums;
  }
  .series-cell__ptitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .series-cell__cta {
    margin-top: auto;
    padding-top: var(--sp-2);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--link);
  }

  /* ── Latest notes list (uses NoteRow) ─────────────── */
  .notes-list {
    display: flex;
    flex-direction: column;
  }

  /* ── About block ─────────────────────────────────── */
  .about-block {
    margin-bottom: var(--sp-6);
  }
  .about-card {
    display: flex;
    gap: var(--sp-4);
    max-width: 640px;
    padding: var(--sp-5);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--bg-elevated);
  }
  .about-card__avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 1px solid var(--line);
  }
  .about-card__body {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    min-width: 0;
  }
  .about-card__name {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--ink);
  }
  .about-card__bio {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--ink-soft);
  }
  .about-card__fields {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-soft);
  }
  .about-card__label {
    color: var(--ink-mute);
  }
  .about-card__links {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
  }
  .about-card__links a {
    color: var(--link);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .about-card__links a:hover {
    color: var(--link-hover);
  }
  .about-card .dot,
  .about-card__fields .dot {
    margin: 0 var(--sp-2);
    color: var(--ink-mute);
  }

  @media (max-width: 560px) {
    .home-layout {
      padding-inline: 0;
    }
    .home-block {
      margin-top: var(--sp-6);
    }
    .home-block__head {
      flex-wrap: wrap;
    }
    .about-card {
      padding: var(--sp-4);
    }
  }
</style>
```

- [ ] **Step 2: Delete src/components/HomeHero.astro**

```bash
rm src/components/HomeHero.astro
```

- [ ] **Step 3: Uninstall typed.js**

```bash
npm uninstall typed.js
```

This modifies `package.json` (removes `"typed.js": "^3.0.0"` from `dependencies`) and regenerates `package-lock.json`.

- [ ] **Step 4: Verify no lingering references**

```bash
grep -rn "HomeHero\|typed\.js\|from \"typed\"\|home-hero-typed" src/ 2>&1 | grep -v "node_modules"
```

Expected: **no output** (or exit code 1 if grep finds nothing). If any match appears, remove that reference before proceeding.

- [ ] **Step 5: Verify build + preview**

```bash
node scripts/test-lib.mjs
node scripts/lint-content.mjs
npm run build
```

Expected: all pass. Then preview:

```bash
npm run preview > /tmp/preview.log 2>&1 &
sleep 3
PORT=$(grep -oE 'localhost:[0-9]+' /tmp/preview.log | head -1 | cut -d: -f2)
for u in "" "posts" "posts/langgraph/01-intro" "series" "series/harness" "tags/Harness" "categories/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0" "search"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/$u")
  echo "$code /$u"
done
kill %1 2>/dev/null; wait 2>/dev/null
```

Expected: all 200. Homepage should now show:
- Nav bar at top (from Task 2)
- SiteHeader name-card
- Series matrix (6 cells with slug · count, rule, title, top 3)
- Latest notes list (10 NoteRow entries)
- About card
- SiteFooter

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro package.json package-lock.json
git rm src/components/HomeHero.astro
git commit -m "$(cat <<'EOF'
feat: rewrite homepage as Zettelkasten editorial index

- Replace full-screen HomeHero + typed.js carousel with a name-card
  SiteHeader.
- Three blocks: 专题矩阵 (6-cell grid, series slug · count · top 3),
  最新笔记 (10 NoteRow entries), 关于 (avatar + bio + 领域 + links).
- Homepage keeps fullWidth (no sidebar); Nav + Footer come from
  BaseLayout.
- Delete src/components/HomeHero.astro; uninstall typed.js dependency.
- public/images/main_page_images/** left in place (no backup).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Do NOT push. Stop and hand off to user for preview + review — this is the biggest visual change.

---

## Task 4 — 列表页迁移（posts / series index / series[series] / tags[tag] / categories[category] / new /tags index）

**Files:**
- Modify: `src/pages/posts/index.astro` (use NoteRow + CategoryTabs)
- Modify: `src/pages/series/index.astro` (big cells with SERIES_META intro + full article list)
- Modify: `src/pages/series/[series].astro` (use NoteRow + SERIES_META title, wide layout)
- Modify: `src/pages/tags/[tag].astro` (h1 `#tag` + simplified NoteRow + related tags)
- Modify: `src/pages/categories/[category].astro` (mirror of tags/[tag] structure)
- Create: `src/pages/tags/index.astro` (all tags overview by frequency)

**Interfaces consumed:**
- `<NoteRow>` (Task 2)
- `<CategoryTabs>` (Task 2)
- `SERIES_META` / `seriesTitle` / `seriesDescription` (Task 1)
- Design tokens (Task 1)

**Interface for CategoryTabs consumers:** each NoteRow's parent `<article>`/`<div>` wrapper must carry `data-post-category="<category>"` for client-side JS to hide/show. NoteRow itself doesn't emit this attribute; the parent page wraps each row.

- [ ] **Step 1: Rewrite src/pages/posts/index.astro**

Replace the ENTIRE file with:

```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";
import NoteRow from "../../components/NoteRow.astro";
import CategoryTabs from "../../components/CategoryTabs.astro";

const CATEGORIES = [
  "机器学习",
  "深度学习",
  "LLM 应用",
  "Agent 框架",
  "Agent 工程",
  "强化学习",
  "工具与笔记"
] as const;

const posts = (await getCollection("posts"))
  .filter((item) => !item.data.draft)
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

const seriesSet = new Set(posts.map((p) => p.data.series).filter(Boolean));
---

<BaseLayout title="文章 | zhang-llmlab" description="全部 33 篇技术笔记，按时间倒序。">
  <h1 class="page-title">文章</h1>
  <p class="page-meta">
    <span class="stat-num">{posts.length}</span> 篇
    <span class="dot">·</span>
    <span class="stat-num">{seriesSet.size}</span> 个专题
  </p>

  <CategoryTabs categories={CATEGORIES} />

  <div class="notes-list">
    {posts.map((p) => (
      <div data-post-category={p.data.category}>
        <NoteRow
          slug={p.slug}
          title={p.data.title}
          description={p.data.description}
          pubDate={p.data.pubDate}
          category={p.data.category}
          series={p.data.series}
          seriesOrder={p.data.seriesOrder}
          tags={p.data.tags}
          variant="index"
        />
      </div>
    ))}
    <p id="cat-empty" class="empty-state" hidden>该分类下暂无文章。</p>
  </div>
</BaseLayout>

<style>
  .page-meta {
    margin: 0 0 var(--sp-4);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-mute);
  }
  .stat-num {
    color: var(--accent);
  }
  .page-meta .dot {
    margin: 0 var(--sp-2);
    color: var(--ink-mute);
  }
  .notes-list {
    display: flex;
    flex-direction: column;
    margin-top: var(--sp-4);
  }
  /* First NoteRow inside its data-wrapper has no border-top; add one via the wrapper */
  .notes-list > div + div .note-row {
    border-top: 1px solid var(--line);
  }
  .empty-state {
    margin: var(--sp-6) 0;
    font-size: var(--fs-sm);
    color: var(--ink-mute);
    text-align: center;
  }
</style>
```

**Note:** wrapping each NoteRow in `<div data-post-category>` breaks the sibling-selector adjacency in NoteRow's own `.note-row + .note-row` rule. That's why the wrapper adds its own border-top via `.notes-list > div + div .note-row`. This is a small transitional cost of the client-side filter approach; documented in code.

- [ ] **Step 2: Rewrite src/pages/series/index.astro**

Replace the ENTIRE file with:

```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";
import { SERIES_META } from "../../lib/series-meta";

const allPosts = (await getCollection("posts")).filter((p) => !p.data.draft && p.data.series);
const slugs = Object.keys(SERIES_META);

const seriesList = slugs.map((slug) => {
  const posts = allPosts
    .filter((p) => p.data.series === slug)
    .sort((a, b) => (a.data.seriesOrder ?? 999) - (b.data.seriesOrder ?? 999));
  return {
    slug,
    title: SERIES_META[slug].title,
    description: SERIES_META[slug].description ?? "",
    posts
  };
});
---

<BaseLayout title="专题 | zhang-llmlab" description="按系列聚合的技术笔记入口。">
  <h1 class="page-title">专题</h1>
  <p class="page-meta">
    <span class="stat-num">{slugs.length}</span> 个专题
    <span class="dot">·</span>
    <span class="stat-num">{allPosts.length}</span> 篇文章
  </p>

  <div class="series-index">
    {seriesList.map((s) => (
      <section class="series-index__item">
        <header class="series-index__head">
          <div class="series-index__slug-line">
            <a class="series-index__slug" href={`/series/${encodeURIComponent(s.slug)}`}>{s.slug}</a>
            <span class="series-index__count">{s.posts.length} 篇</span>
          </div>
          <div class="series-index__rule" aria-hidden="true"></div>
          <h2 class="series-index__title">
            <a href={`/series/${encodeURIComponent(s.slug)}`}>{s.title}</a>
          </h2>
          {s.description && <p class="series-index__desc">{s.description}</p>}
        </header>
        <ol class="series-index__list">
          {s.posts.map((p) => (
            <li>
              <span class="series-index__order">
                {p.data.seriesOrder != null ? String(p.data.seriesOrder).padStart(2, "0") : "··"}
              </span>
              <a class="series-index__ptitle" href={`/posts/${p.slug}`}>{p.data.title}</a>
            </li>
          ))}
        </ol>
      </section>
    ))}
  </div>
</BaseLayout>

<style>
  .page-meta {
    margin: 0 0 var(--sp-5);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-mute);
  }
  .stat-num { color: var(--accent); }
  .page-meta .dot {
    margin: 0 var(--sp-2);
    color: var(--ink-mute);
  }

  .series-index {
    display: flex;
    flex-direction: column;
    gap: var(--sp-7);
  }
  .series-index__item {
    padding-top: var(--sp-5);
    border-top: 1px solid var(--line);
  }
  .series-index__item:first-child {
    border-top: none;
    padding-top: 0;
  }
  .series-index__head {
    margin-bottom: var(--sp-4);
  }
  .series-index__slug-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    margin-bottom: var(--sp-2);
  }
  .series-index__slug {
    color: var(--ink);
    text-decoration: none;
    letter-spacing: -0.01em;
    transition: color 0.15s ease;
  }
  .series-index__slug:hover { color: var(--accent); }
  .series-index__count { color: var(--ink-mute); }
  .series-index__rule {
    width: 2ch;
    height: 1px;
    background: var(--accent-line);
    margin-bottom: var(--sp-3);
  }
  .series-index__title {
    margin: 0 0 var(--sp-2);
    font-size: var(--fs-xl);
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--ink);
    text-wrap: balance;
  }
  .series-index__title a {
    color: inherit;
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .series-index__title a:hover { color: var(--accent); }
  .series-index__desc {
    margin: 0;
    font-size: var(--fs-base);
    line-height: 1.6;
    color: var(--ink-soft);
    max-width: 52ch;
    text-wrap: pretty;
  }
  .series-index__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .series-index__list li {
    display: flex;
    gap: var(--sp-3);
    align-items: baseline;
    font-size: var(--fs-sm);
  }
  .series-index__order {
    flex-shrink: 0;
    font-family: var(--font-mono);
    color: var(--ink-mute);
    font-variant-numeric: tabular-nums;
  }
  .series-index__ptitle {
    color: var(--ink-soft);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .series-index__ptitle:hover {
    color: var(--accent);
  }
</style>
```

- [ ] **Step 3: Rewrite src/pages/series/[series].astro**

Replace the ENTIRE file with:

```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";
import NoteRow from "../../components/NoteRow.astro";
import { SERIES_META } from "../../lib/series-meta";

export async function getStaticPaths() {
  const posts = (await getCollection("posts")).filter((p) => !p.data.draft && p.data.series);
  const names = new Set<string>();
  posts.forEach((p) => names.add(p.data.series as string));
  return Array.from(names).map((series) => ({ params: { series } }));
}

const seriesName = Astro.params.series ?? "";
const meta = SERIES_META[seriesName];
const displayTitle = meta?.title ?? seriesName;
const description = meta?.description ?? "";

const posts = (await getCollection("posts"))
  .filter((p) => !p.data.draft && p.data.series === seriesName)
  .sort((a, b) => {
    const oa = a.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;
    const ob = b.data.seriesOrder ?? Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    return a.data.pubDate.valueOf() - b.data.pubDate.valueOf();
  });

function fmtYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const firstDate = posts[0]?.data.pubDate;
const lastDate = posts.reduce<Date | undefined>((acc, p) => {
  const d = p.data.updatedDate ?? p.data.pubDate;
  return !acc || d > acc ? d : acc;
}, undefined);
---

<BaseLayout title={`${displayTitle} | zhang-llmlab`} description={description}>
  <p class="series-page__meta">
    <span class="series-page__slug">{seriesName}</span>
    <span class="dot">·</span>
    <span class="stat-num">{posts.length}</span> 篇
    {firstDate && <><span class="dot">·</span>首发 <span class="stat-num">{fmtYmd(firstDate)}</span></>}
    {lastDate && <><span class="dot">·</span>最后更新 <span class="stat-num">{fmtYmd(lastDate)}</span></>}
  </p>
  <h1 class="page-title">{displayTitle}</h1>
  {description && <p class="series-page__desc">{description}</p>}

  <div class="notes-list">
    {posts.map((p) => (
      <NoteRow
        slug={p.slug}
        title={p.data.title}
        description={p.data.description}
        pubDate={p.data.pubDate}
        category={p.data.category}
        series={p.data.series}
        seriesOrder={p.data.seriesOrder}
        tags={p.data.tags}
        variant="detail"
      />
    ))}
  </div>
</BaseLayout>

<style>
  .series-page__meta {
    margin: 0 0 var(--sp-3);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-mute);
  }
  .series-page__slug {
    color: var(--ink);
  }
  .stat-num { color: var(--accent); }
  .series-page__meta .dot {
    margin: 0 var(--sp-2);
    color: var(--ink-mute);
  }
  .series-page__desc {
    margin: 0 0 var(--sp-5);
    font-size: var(--fs-base);
    line-height: 1.65;
    color: var(--ink-soft);
    max-width: 54ch;
    text-wrap: pretty;
  }
  .notes-list {
    display: flex;
    flex-direction: column;
    margin-top: var(--sp-5);
  }
</style>
```

- [ ] **Step 4: Rewrite src/pages/tags/[tag].astro**

Replace the ENTIRE file with:

```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";

function postMatchesTag(tags: string[], keywords: string[], needle: string): boolean {
  if (tags.includes(needle)) return true;
  return keywords.some((k) => k.trim() === needle);
}

export async function getStaticPaths() {
  const posts = (await getCollection("posts")).filter((p) => !p.data.draft);
  const projects = (await getCollection("projects")).filter((p) => !p.data.draft);
  const names = new Set<string>();
  for (const entry of posts) {
    entry.data.tags.forEach((tag) => names.add(tag));
    for (const k of entry.data.keywords || []) {
      const t = String(k).trim();
      if (t) names.add(t);
    }
  }
  projects.forEach((entry) => entry.data.tags.forEach((tag) => names.add(tag)));
  return Array.from(names).map((tag) => ({ params: { tag } }));
}

const { tag } = Astro.params;
const needle = tag ?? "";

const posts = (await getCollection("posts")).filter(
  (item) => !item.data.draft && postMatchesTag(item.data.tags, item.data.keywords ?? [], needle)
);
const projects = (await getCollection("projects")).filter(
  (item) => !item.data.draft && item.data.tags.includes(needle)
);

// Compute related tags: for each other tag that co-occurs with this tag, count occurrences
const coOccur = new Map<string, number>();
for (const p of posts) {
  const all = new Set<string>([...p.data.tags, ...(p.data.keywords || []).map((k) => String(k).trim())]);
  all.delete(needle);
  for (const t of all) coOccur.set(t, (coOccur.get(t) ?? 0) + 1);
}
const related = Array.from(coOccur.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

function fmtYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
---

<BaseLayout title={`#${needle} | zhang-llmlab`} description={`带 ${needle} 标签的笔记与项目。`}>
  <h1 class="page-title">#{needle}</h1>
  <p class="page-meta">
    <span class="stat-num">{posts.length}</span> 篇文章
    {projects.length > 0 && (<><span class="dot">·</span><span class="stat-num">{projects.length}</span> 个项目</>)}
  </p>

  {posts.length > 0 && (
    <section class="taxo-block">
      <h2 class="taxo-block__title">文章</h2>
      <ul class="taxo-list">
        {posts.map((p) => (
          <li class="taxo-row">
            <time datetime={p.data.pubDate.toISOString()}>{fmtYmd(p.data.pubDate)}</time>
            <a href={`/posts/${p.slug}`}>{p.data.title}</a>
          </li>
        ))}
      </ul>
    </section>
  )}

  {projects.length > 0 && (
    <section class="taxo-block">
      <h2 class="taxo-block__title">项目</h2>
      <ul class="taxo-list">
        {projects.map((p) => (
          <li class="taxo-row">
            <span class="taxo-placeholder" aria-hidden="true">——</span>
            <a href={`/projects/${p.slug}`}>{p.data.title}</a>
          </li>
        ))}
      </ul>
    </section>
  )}

  {related.length > 0 && (
    <section class="taxo-block">
      <h2 class="taxo-block__title">相关标签</h2>
      <div class="side-block__chips">
        {related.map(([t]) => (
          <a class="tag-chip" href={`/tags/${encodeURIComponent(t)}`}>{t}</a>
        ))}
      </div>
    </section>
  )}
</BaseLayout>

<style>
  .page-title {
    font-family: var(--font-mono);
    font-weight: 500;
  }
  .page-meta {
    margin: 0 0 var(--sp-5);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-mute);
  }
  .stat-num { color: var(--accent); }
  .page-meta .dot {
    margin: 0 var(--sp-2);
    color: var(--ink-mute);
  }
  .taxo-block { margin-top: var(--sp-6); }
  .taxo-block__title {
    margin: 0 0 var(--sp-4);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    font-weight: 500;
    color: var(--ink-mute);
    padding-bottom: var(--sp-2);
    border-bottom: 1px solid var(--line);
  }
  .taxo-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .taxo-row {
    display: flex;
    gap: var(--sp-4);
    align-items: baseline;
    font-size: var(--fs-sm);
  }
  .taxo-row time,
  .taxo-placeholder {
    flex-shrink: 0;
    width: 6.5rem;
    font-family: var(--font-mono);
    color: var(--ink-mute);
    font-variant-numeric: tabular-nums;
  }
  .taxo-row a {
    color: var(--ink);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .taxo-row a:hover { color: var(--accent); }
  .side-block__chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
  }
</style>
```

- [ ] **Step 5: Rewrite src/pages/categories/[category].astro (mirror of tags)**

Replace the ENTIRE file with:

```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";

export async function getStaticPaths() {
  const posts = (await getCollection("posts")).filter((p) => !p.data.draft);
  const names = new Set<string>();
  posts.forEach((p) => names.add(p.data.category));
  return Array.from(names).map((category) => ({ params: { category } }));
}

const { category } = Astro.params;
const needle = category ?? "";

const posts = (await getCollection("posts"))
  .filter((p) => !p.data.draft && p.data.category === needle)
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

function fmtYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
---

<BaseLayout title={`分类：${needle} | zhang-llmlab`} description={`${needle} 分类下的技术笔记。`}>
  <h1 class="page-title">分类：{needle}</h1>
  <p class="page-meta">
    <span class="stat-num">{posts.length}</span> 篇文章
  </p>

  <ul class="taxo-list">
    {posts.map((p) => (
      <li class="taxo-row">
        <time datetime={p.data.pubDate.toISOString()}>{fmtYmd(p.data.pubDate)}</time>
        <a href={`/posts/${p.slug}`}>{p.data.title}</a>
      </li>
    ))}
  </ul>
</BaseLayout>

<style>
  .page-meta {
    margin: 0 0 var(--sp-5);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-mute);
  }
  .stat-num { color: var(--accent); }
  .taxo-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .taxo-row {
    display: flex;
    gap: var(--sp-4);
    align-items: baseline;
    font-size: var(--fs-sm);
  }
  .taxo-row time {
    flex-shrink: 0;
    width: 6.5rem;
    font-family: var(--font-mono);
    color: var(--ink-mute);
    font-variant-numeric: tabular-nums;
  }
  .taxo-row a {
    color: var(--ink);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .taxo-row a:hover { color: var(--accent); }
</style>
```

- [ ] **Step 6: Create src/pages/tags/index.astro (all tags overview)**

```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";

const posts = (await getCollection("posts")).filter((p) => !p.data.draft);
const projects = (await getCollection("projects")).filter((p) => !p.data.draft);

const tagCounts = new Map<string, number>();
for (const p of posts) {
  const seen = new Set<string>();
  for (const t of p.data.tags) seen.add(t);
  for (const k of p.data.keywords || []) {
    const s = String(k).trim();
    if (s) seen.add(s);
  }
  for (const t of seen) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
}
for (const p of projects) {
  for (const t of p.data.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
}

const sorted = Array.from(tagCounts.entries()).sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN")
);
---

<BaseLayout title="标签 | zhang-llmlab" description="全部标签，按出现频次排序。">
  <h1 class="page-title">标签</h1>
  <p class="page-meta">
    共 <span class="stat-num">{sorted.length}</span> 个标签
  </p>
  <div class="tag-cloud">
    {sorted.map(([t, n]) => (
      <a class="tag-chip tag-chip--big" href={`/tags/${encodeURIComponent(t)}`}>
        <span class="tag-chip__name">{t}</span>
        <span class="tag-chip__count">{n}</span>
      </a>
    ))}
  </div>
</BaseLayout>

<style>
  .page-meta {
    margin: 0 0 var(--sp-5);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-mute);
  }
  .stat-num { color: var(--accent); }
  .tag-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
  }
  .tag-chip--big {
    padding: var(--sp-2) var(--sp-3);
    font-size: var(--fs-sm);
    gap: var(--sp-2);
  }
  .tag-chip__name { color: inherit; }
  .tag-chip__count {
    color: var(--ink-mute);
    font-variant-numeric: tabular-nums;
    font-size: var(--fs-xs);
  }
  .tag-chip--big:hover .tag-chip__count {
    color: var(--ink-soft);
  }
</style>
```

- [ ] **Step 7: Verify build + preview**

```bash
node scripts/test-lib.mjs
node scripts/lint-content.mjs
npm run build
```

Expected: all pass. Then preview:

```bash
npm run preview > /tmp/preview.log 2>&1 &
sleep 3
PORT=$(grep -oE 'localhost:[0-9]+' /tmp/preview.log | head -1 | cut -d: -f2)
for u in "" "posts" "posts?category=%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0" \
         "series" "series/langgraph" "series/harness" \
         "tags" "tags/Harness" "tags/LangGraph" \
         "categories/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0" \
         "posts/langgraph/01-intro"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/$u")
  echo "$code /$u"
done
kill %1 2>/dev/null; wait 2>/dev/null
```

Expected: all 200. Also manually confirm via browser that:
- `/posts` shows all 33 rows and category tabs filter correctly (click "机器学习" → only ml-basics rows visible; click "全部" → all visible again)
- `/series` shows 6 big blocks each with intro + all sub-posts
- `/series/langgraph` shows Chinese title "LangGraph 与智能体应用" + description + 7 NoteRow entries in order 01→07
- `/tags` shows all tags with counts, sortable
- `/tags/Harness` shows h1 `#Harness` + related tags block
- `/categories/机器学习` renders

- [ ] **Step 8: Commit**

```bash
git add src/pages/posts/index.astro \
        src/pages/series/index.astro \
        src/pages/series/[series].astro \
        src/pages/tags/[tag].astro \
        src/pages/categories/[category].astro \
        src/pages/tags/index.astro
git commit -m "$(cat <<'EOF'
feat: migrate list pages to NoteRow + SERIES_META + CategoryTabs

- /posts: NoteRow x 33 with a CategoryTabs strip; client-side ?category=X
  filter hides/shows rows without navigation.
- /series: big-cell listing per series (slug/count/rule/title/description/
  all posts) using SERIES_META for Chinese titles.
- /series/[series]: NoteRow (variant=detail) sorted by seriesOrder;
  Chinese title from SERIES_META; first/last date meta line.
- /tags/[tag]: h1 becomes #tag; simplified time+title rows + related-tags
  block (top 6 co-occurring).
- /categories/[category]: mirror of tags/[tag] with time+title rows.
- /tags/index.astro: new all-tags overview page sorted by frequency,
  target of Sidebar 更多 → link.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Do NOT push. Stop and hand off to user for preview + review.

---

## Task 5 — 文章详情页（PostLayout + ArticleToc + prose.css palette）

**Files:**
- Modify: `src/layouts/PostLayout.astro` (rewrite header block + series-nav + series-pager)
- Modify: `src/pages/posts/[...slug].astro` (pass raw body text to layout for readingTime)
- Modify: `src/components/ArticleToc.astro` (remove border-left color strips, add `·` prefix, use accent for active)
- Modify: `src/styles/prose.css` (swap palette variables to new tokens; keep structure)

**Interfaces consumed:**
- `seriesTitle(slug)` and `SERIES_META[slug]` (Task 1)
- `readingTime(body)` (Task 1)
- Design tokens (Task 1)
- `.tag-chip` class (Task 2)

- [ ] **Step 1: Update src/pages/posts/[...slug].astro to pass raw body**

Read the file first. Currently it destructures `{ Content, headings } = await render(post)`. Add `body: post.body` to the props sent to `PostLayout`.

Modify the props object in the `<PostLayout ... />` call. Add:
```astro
body={post.body}
```

Final props block (add `body`, everything else stays):
```astro
<PostLayout
  title={post.data.title}
  description={post.data.description}
  pubDate={post.data.pubDate}
  category={post.data.category}
  tags={post.data.tags}
  series={post.data.series}
  seriesOrder={post.data.seriesOrder}
  seriesItems={seriesItems}
  currentSlug={post.slug}
  prevInSeries={prevInSeries}
  nextInSeries={nextInSeries}
  headings={headings}
  toc={post.data.toc}
  body={post.body}
>
  <Content />
</PostLayout>
```

- [ ] **Step 2: Rewrite src/layouts/PostLayout.astro**

Read the file first. Replace the ENTIRE file with:

```astro
---
import type { MarkdownHeading } from "astro";
import "../styles/prose.css";
import ArticleToc from "../components/ArticleToc.astro";
import BaseLayout from "./BaseLayout.astro";
import Giscus from "../components/Giscus.astro";
import MermaidRuntime from "../components/MermaidRuntime.astro";
import ScrollJumps from "../components/ScrollJumps.astro";
import { seriesTitle } from "../lib/series-meta";
import { readingTime } from "../lib/reading-time";
import { excerpt } from "../lib/text";

interface Props {
  title: string;
  description?: string;
  pubDate?: Date;
  tags?: string[];
  category?: string;
  series?: string;
  seriesOrder?: number;
  seriesItems?: { slug: string; title: string; order?: number; pubDate?: Date }[];
  currentSlug?: string;
  prevInSeries?: { slug: string; title: string; order?: number };
  nextInSeries?: { slug: string; title: string; order?: number };
  showComments?: boolean;
  headings?: MarkdownHeading[];
  toc?: boolean | "inline";
  body?: string;
}

const {
  title, description, pubDate, tags = [], category = "未分类",
  series, seriesOrder, seriesItems = [], currentSlug,
  prevInSeries, nextInSeries, showComments = true,
  headings = [], toc = true, body = ""
} = Astro.props;

const tocHeadings = headings.filter((h) => h.depth >= 1 && h.depth <= 5 && h.slug);
const tocOn = toc !== false;
const showSidebarToc = tocOn && toc !== "inline" && tocHeadings.length > 0;
const showInlineToc = tocOn && toc === "inline" && tocHeadings.length > 0;

const minutes = body ? readingTime(body) : 0;
const cleanedDesc = excerpt(description, 180);
const orderLabel = seriesOrder != null ? String(seriesOrder).padStart(2, "0") : "";

function fmtYmd(d?: Date) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
---

<BaseLayout title={title} description={description}>
  <article class="post">
    <header class="post-header">
      <p class="post-header__meta">
        {pubDate && <><time datetime={pubDate.toISOString()}>{fmtYmd(pubDate)}</time><span class="dot">·</span></>}
        <span>{category}</span>
        {minutes > 0 && <><span class="dot">·</span>阅读时长约 <span class="stat-num">{minutes}</span> 分钟</>}
      </p>
      <div class="post-header__rule" aria-hidden="true"></div>
      <h1 class="post-header__title">{title}</h1>
      {cleanedDesc && <p class="post-header__desc">{cleanedDesc}</p>}
      {tags.length > 0 && (
        <div class="post-header__tags">
          {tags.map((t) => <a class="tag-chip" href={`/tags/${encodeURIComponent(t)}`}>{t}</a>)}
        </div>
      )}
      {series && (
        <p class="post-header__series">
          所属专题：<a href={`/series/${encodeURIComponent(series)}`}>{seriesTitle(series)}</a>
          <span class="mono-badge">
            (<span>{series}</span><span class="dot-accent">·</span><span>{orderLabel}</span>)
          </span>
        </p>
      )}
    </header>

    <div class:list={["post-body", { "post-body--with-toc": showSidebarToc }]}>
      {showSidebarToc && <ArticleToc headings={tocHeadings} variant="sidebar" />}
      <div class="post-main">
        {showInlineToc && <ArticleToc headings={tocHeadings} variant="inline" />}
        <div class="content prose">
          <slot />
        </div>
      </div>
    </div>
  </article>

  {series && seriesItems.length > 0 && (
    <>
      <aside class="series-nav">
        <p class="series-nav__meta">
          <span>{series}</span>
          <span class="dot">·</span>
          <span class="stat-num">{seriesItems.length}</span> 篇
        </p>
        <h3 class="series-nav__title">{seriesTitle(series)}</h3>
        <ol class="series-nav__list">
          {seriesItems.map((item) => (
            <li>
              <a class:list={[{ "is-active": item.slug === currentSlug }]} href={`/posts/${item.slug}`}>
                <span class="series-nav__order">
                  {item.order != null ? String(item.order).padStart(2, "0") : "··"}
                </span>
                <span class="series-nav__ptitle">{item.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </aside>

      {(prevInSeries || nextInSeries) && (
        <nav class="series-pager" aria-label="专题上下篇导航">
          <div class="series-pager__cell series-pager__cell--prev">
            {prevInSeries ? (
              <a href={`/posts/${prevInSeries.slug}`}>
                <span class="series-pager__hint">← 上一篇</span>
                <strong>{prevInSeries.title}</strong>
              </a>
            ) : <span />}
          </div>
          <div class="series-pager__cell series-pager__cell--next">
            {nextInSeries ? (
              <a href={`/posts/${nextInSeries.slug}`}>
                <span class="series-pager__hint">下一篇 →</span>
                <strong>{nextInSeries.title}</strong>
              </a>
            ) : <span />}
          </div>
        </nav>
      )}
    </>
  )}

  {showComments && <Giscus />}
  <MermaidRuntime />
  <ScrollJumps />
</BaseLayout>

<style>
  .post { padding: var(--sp-5) 0 var(--sp-6); }

  .post-header { margin-bottom: var(--sp-6); }
  .post-header__meta {
    margin: 0 0 var(--sp-3);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-mute);
  }
  .post-header__meta time { color: var(--ink); }
  .post-header__meta .dot { margin: 0 var(--sp-2); }
  .stat-num { color: var(--accent); }
  .post-header__rule {
    width: 8em;
    height: 1px;
    background: var(--accent-line);
    margin-bottom: var(--sp-4);
  }
  .post-header__title {
    margin: 0 0 var(--sp-3);
    font-size: var(--fs-2xl);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.2;
    color: var(--ink);
    text-wrap: balance;
  }
  .post-header__desc {
    margin: 0 0 var(--sp-4);
    font-size: var(--fs-base);
    line-height: 1.65;
    color: var(--ink-soft);
    max-width: 54ch;
    text-wrap: pretty;
  }
  .post-header__tags {
    display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-3);
  }
  .post-header__series {
    margin: var(--sp-2) 0 0;
    font-size: var(--fs-sm);
    color: var(--ink-soft);
  }
  .post-header__series a {
    color: var(--link);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .post-header__series a:hover { color: var(--link-hover); }
  .post-header__series .mono-badge {
    font-family: var(--font-mono);
    color: var(--ink-mute);
    margin-left: var(--sp-2);
  }
  .post-header__series .dot-accent { color: var(--accent); margin: 0 1px; }

  .post-body {
    position: relative;
    display: grid;
    gap: var(--sp-5);
    align-items: start;
  }
  .post-body--with-toc { grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 1080px) {
    .post-body--with-toc {
      grid-template-columns: minmax(11rem, 13.5rem) minmax(0, 1fr);
      gap: var(--sp-6);
    }
  }
  .post-main { min-width: 0; }

  .series-nav {
    margin-top: var(--sp-6);
    padding-top: var(--sp-5);
    border-top: 1px solid var(--line);
  }
  .series-nav__meta {
    margin: 0 0 var(--sp-2);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--ink-mute);
  }
  .series-nav__meta .dot { margin: 0 var(--sp-2); }
  .series-nav__title {
    margin: 0 0 var(--sp-4);
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .series-nav__list {
    margin: 0; padding: 0; list-style: none;
    display: flex; flex-direction: column; gap: var(--sp-1);
  }
  .series-nav__list a {
    display: flex; gap: var(--sp-3); align-items: baseline;
    padding: var(--sp-2) var(--sp-3);
    border-radius: 6px;
    color: var(--ink-soft);
    text-decoration: none;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .series-nav__list a:hover { color: var(--ink); }
  .series-nav__list a.is-active {
    color: var(--ink);
    background: var(--accent-soft);
  }
  .series-nav__order {
    flex-shrink: 0;
    font-family: var(--font-mono);
    color: var(--ink-mute);
    font-variant-numeric: tabular-nums;
    font-size: var(--fs-sm);
  }
  .series-nav__list a.is-active .series-nav__order { color: var(--accent); }
  .series-nav__ptitle { font-size: var(--fs-sm); }

  .series-pager {
    margin-top: var(--sp-5);
    padding-top: var(--sp-5);
    border-top: 1px solid var(--line);
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    gap: var(--sp-4);
    align-items: stretch;
  }
  .series-pager::after {
    content: "";
    grid-column: 2;
    background: var(--line);
  }
  .series-pager__cell {
    display: flex; flex-direction: column; gap: var(--sp-2);
    min-width: 0;
  }
  .series-pager__cell--next { text-align: right; align-items: flex-end; }
  .series-pager__cell a {
    display: flex; flex-direction: column; gap: var(--sp-1);
    color: var(--ink);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .series-pager__cell a:hover { color: var(--accent); }
  .series-pager__hint {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--ink-mute);
  }
  .series-pager__cell strong {
    font-weight: 600;
    letter-spacing: -0.01em;
    font-size: var(--fs-sm);
    text-wrap: balance;
  }
  @media (max-width: 720px) {
    .series-pager { grid-template-columns: 1fr; }
    .series-pager::after { display: none; }
    .series-pager__cell--next { text-align: left; align-items: flex-start; }
  }
</style>
```

- [ ] **Step 3: Rewrite src/components/ArticleToc.astro**

Read the file first. Replace the ENTIRE file with:

```astro
---
import type { MarkdownHeading } from "astro";

interface Props {
  headings: MarkdownHeading[];
  variant?: "sidebar" | "inline";
}
const { headings, variant = "sidebar" } = Astro.props;
---

<nav class:list={["article-toc", `article-toc--${variant}`]} aria-label="目录">
  <p class="article-toc__title">目录</p>
  <ol class="article-toc__list">
    {headings.map((h) => (
      <li
        class:list={["article-toc__item", `article-toc__item--d${h.depth}`]}
        style={`--toc-depth: ${Math.max(0, h.depth - 1)}`}
      >
        <a href={`#${h.slug}`} data-toc-link={h.slug}>
          <span class="article-toc__marker" aria-hidden="true">·</span>
          <span class="article-toc__text">{h.text}</span>
        </a>
      </li>
    ))}
  </ol>
</nav>

<style>
  .article-toc { font-size: var(--fs-sm); line-height: 1.5; }
  .article-toc__title {
    margin: 0 0 var(--sp-3);
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: var(--fs-xs);
    color: var(--ink-mute);
  }
  .article-toc__list {
    margin: 0; padding: 0; list-style: none;
    display: flex; flex-direction: column; gap: 2px;
  }
  .article-toc__item {
    padding-left: calc(var(--toc-depth, 0) * 0.85rem);
  }
  .article-toc__item a {
    display: flex; gap: var(--sp-2); align-items: baseline;
    color: var(--ink-soft);
    text-decoration: none;
    padding: 2px 0;
    transition: color 0.15s ease;
  }
  .article-toc__item a:hover { color: var(--ink); }
  .article-toc__item a.is-current { color: var(--accent); }
  .article-toc__marker {
    flex-shrink: 0;
    font-family: var(--font-mono);
    color: var(--ink-mute);
    line-height: 1;
  }
  .article-toc__item a.is-current .article-toc__marker { color: var(--accent); }

  .article-toc--sidebar {
    position: sticky;
    top: calc(56px + var(--sp-4));
    max-height: calc(100vh - 56px - var(--sp-6));
    overflow-y: auto;
    padding-right: var(--sp-2);
  }
  .article-toc--inline {
    margin: var(--sp-4) 0 var(--sp-5);
    padding: var(--sp-4);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--bg-elevated);
  }
</style>

<script>
  function initToc() {
    const links = document.querySelectorAll<HTMLAnchorElement>("[data-toc-link]");
    if (!links.length) return;
    const bySlug = new Map<string, HTMLAnchorElement>();
    links.forEach((a) => bySlug.set(a.dataset.tocLink ?? "", a));

    const sections: HTMLElement[] = [];
    bySlug.forEach((_, slug) => {
      const el = document.getElementById(slug);
      if (el) sections.push(el);
    });
    if (!sections.length) return;

    let currentSlug = "";
    function setCurrent(slug: string) {
      if (slug === currentSlug) return;
      currentSlug = slug;
      links.forEach((a) => a.classList.toggle("is-current", a.dataset.tocLink === slug));
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
  }

  document.addEventListener("astro:page-load", initToc);
  initToc();
</script>
```

- [ ] **Step 4: Update src/styles/prose.css tokens**

Read the file first. Apply these swaps via the Edit tool:

- `var(--text)` → `var(--ink)` (use replace_all)
- `var(--text-soft)` → `var(--ink-soft)` (replace_all)
- `var(--text-muted)` → `var(--ink-mute)` (replace_all)
- `var(--brand)` → `var(--accent)` (replace_all)
- `var(--brand-2)` → `var(--link)` (replace_all)
- `var(--brand-hover)` → `var(--link-hover)` (replace_all)
- Any hardcoded `rgba(201, 169, 98, 0.08)` or `rgba(201, 169, 98, 0.1)` → `var(--accent-soft)`
- Any hardcoded `rgba(201, 169, 98, 0.22)` → `var(--accent-line)`
- `rgba(0, 0, 0, 0.22)` in `.prose img` shadow → `rgba(0, 0, 0, 0.35)`

Keep untouched: `var(--line)`, `var(--line-strong)`, `var(--code-*)`, `var(--focus)`, `var(--font-*)`.

Verify:
```bash
grep -nE 'rgba\(201|var\(--text|var\(--brand' src/styles/prose.css
```
Expected: no output.

- [ ] **Step 5: Verify build + preview**

```bash
node scripts/test-lib.mjs
node scripts/lint-content.mjs
npm run build
```

Then:

```bash
npm run preview > /tmp/preview.log 2>&1 &
sleep 3
PORT=$(grep -oE 'localhost:[0-9]+' /tmp/preview.log | head -1 | cut -d: -f2)
for u in "posts/langgraph/01-intro" "posts/langgraph/07-send" \
         "posts/pytorch/03-autograd" "posts/ml-basics/08-knn" \
         "posts/harness/03-essence-claude-code" "posts/agent-dev/04-unified-entry" \
         "posts/skills/01-principles" "posts/misc/rl-concepts"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/$u")
  echo "$code /$u"
done
kill %1 2>/dev/null; wait 2>/dev/null
```

Expected: all 200.

Report to user for visual review:
- Post header shows mono meta line with 阅读时长
- TOC active section highlights in accent while scrolling
- Series nav shows Chinese title + numbered rows; current post highlighted with accent-soft bg
- Series pager: no boxes; center vertical line divides prev/next
- Prose body uses new palette

- [ ] **Step 6: Commit**

```bash
git add src/layouts/PostLayout.astro \
        "src/pages/posts/[...slug].astro" \
        src/components/ArticleToc.astro \
        src/styles/prose.css
git commit -m "$(cat <<'EOF'
feat: rewrite article detail page + TOC + prose palette

- PostLayout: mono meta (date · category · reading time), accent rule,
  tag-chip cluster, series line with Chinese title via SERIES_META and
  mono badge (slug·NN). Series-nav uses mono order prefixes; current
  post gets accent-soft bg. Series-pager loses boxes — only top divider
  and central vertical hairline.
- posts/[...slug]: pass post.body so PostLayout can compute readingTime.
- ArticleToc: drop border-left color strips; each item leads with a
  mono `·` marker; active section (via IntersectionObserver) turns
  accent.
- prose.css: token swap to new palette (--text/--brand families →
  --ink/--accent/--link).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Do NOT push. Stop and hand off to user for preview + review — read one long article + scroll to test TOC active tracking.

---

## Task 6 — 清理 + 最终验证 + push

**Files:**
- Modify: `src/styles/global.css` (remove unused legacy alias tokens)
- Modify: `src/components/ThemeToggle.astro` (audit; may need palette-only touchup)
- Modify: `src/components/Giscus.astro` / `src/components/ScrollJumps.astro` / `src/components/MermaidRuntime.astro` (audit for hardcoded old palette; palette-only touchup if needed)
- Modify: `src/pages/search.astro` (may still reference `.card` styles — palette-only touchup)
- Modify: `src/pages/projects/[slug].astro` (existing project detail page — palette touchup)
- Verify: `public/images/main_page_images/**` untouched
- Verify: no references to `HomeHero`, `typed.js`, `--brand`, `--text-*`, `--card` remain in source (except legitimate remaining aliases in global.css)

**Interfaces produced by this task:** none new. Cleanup only.

- [ ] **Step 1: Scan for lingering old-token references**

```bash
grep -rnE 'var\(--brand[^)]*\)|var\(--text[^)]*\)|var\(--card[^)]*\)' src/ --include='*.astro' --include='*.css' 2>&1 | grep -v 'src/styles/global.css' | sort -u
```

Expected: possibly some hits in `src/pages/search.astro`, `src/pages/projects/[slug].astro`, `src/components/ThemeToggle.astro`, `src/components/ScrollJumps.astro`, `src/components/Giscus.astro`, `src/components/MermaidRuntime.astro`. Record them in a list.

For each hit, apply the same swap rules as Task 5 Step 4:
- `var(--text)` → `var(--ink)`
- `var(--text-soft)` → `var(--ink-soft)`
- `var(--text-muted)` → `var(--ink-mute)`
- `var(--brand)` → `var(--accent)`
- `var(--brand-2)` → `var(--link)`
- `var(--brand-hover)` → `var(--link-hover)`
- `var(--card)` → `var(--bg-elevated)`
- `var(--card-hover)` → `var(--bg-soft)`

Re-run the grep after each file's edits to confirm reduction.

- [ ] **Step 2: Scan for remaining amber hardcoded colors**

```bash
grep -rnE 'rgba\(201, ?169, ?98' src/ --include='*.astro' --include='*.css' 2>&1
```

Expected: possibly hits in HomeHero-adjacent leftover CSS. Swap to `var(--accent-soft)` or `var(--accent-line)` matching alpha. If ambiguous, prefer `var(--accent-soft)` for backgrounds and `var(--accent-line)` for borders.

- [ ] **Step 3: Remove legacy aliases that are no longer referenced**

After Steps 1-2 report zero hits (or only expected legacy hits inside `global.css` itself), open `src/styles/global.css` and remove alias declarations from the `:root { ... }` and `html[data-theme="light"] { ... }` blocks that are no longer referenced anywhere.

Aliases to attempt removing (verify each via grep first — if any file still uses it, keep the alias):
- `--text`, `--text-soft`, `--text-muted`
- `--brand`, `--brand-hover`, `--brand-2`
- `--card`, `--card-hover`, `--card-shine`
- `--sidebar-card-bg`, `--sidebar-card-border`, `--sidebar-card-shadow`, `--sidebar-title`, `--sidebar-muted`, `--sidebar-divider`, `--sidebar-badge-bg`, `--sidebar-social-bg`

Keep unconditionally (still legitimate):
- `--code-bg`, `--code-border`, `--code-inline-*` (used in prose.css)
- `--body-bg` (used in body)
- `--content-max` (used in Nav)
- `--focus` (focus outline)
- `--ease-out` (transitions)
- `--radius`, `--radius-lg` (used throughout)
- `--shadow-sm`, `--shadow-md` (may still be referenced)

For each alias you attempt to remove: `grep -rn 'var(--alias-name)' src/` first; only delete the declaration if grep returns nothing.

- [ ] **Step 4: Scan for other lingering references**

```bash
grep -rnE 'HomeHero|typed\.js|from "typed"|main_page_images|readdirSync' src/ 2>&1
```

Expected: no hits (all should have been removed in Task 3; if any survived — e.g. a stale import — remove them now).

Also verify hero images are still on disk:
```bash
ls public/images/main_page_images/
```
Expected: the original 4 files still present.

- [ ] **Step 5: Final full local verification**

```bash
node scripts/test-lib.mjs
node scripts/lint-content.mjs
npm run build
```

Expected: all three exit 0. If build warnings appear (e.g. unused CSS selector), decide inline:
- Legitimate stale rule → remove
- Rule targeting dynamic classes → suppress with an inline comment noting why

- [ ] **Step 6: Preview抽验 comprehensive route sweep**

```bash
npm run preview > /tmp/preview.log 2>&1 &
sleep 3
PORT=$(grep -oE 'localhost:[0-9]+' /tmp/preview.log | head -1 | cut -d: -f2)

for u in \
  "" "posts" \
  "posts?category=%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0" \
  "series" \
  "series/langgraph" "series/pytorch" "series/ml-basics" \
  "series/agent-dev" "series/skills" "series/harness" \
  "tags" \
  "tags/Harness" "tags/LangGraph" "tags/Multi-Agent" \
  "categories/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0" \
  "categories/Agent%20%E5%B7%A5%E7%A8%8B" \
  "search" \
  "rss.xml" "sitemap-0.xml" \
  "posts/langgraph/01-intro" "posts/pytorch/03-autograd" \
  "posts/ml-basics/08-knn" "posts/harness/03-essence-claude-code" \
  "posts/skills/01-principles" "posts/misc/rl-concepts" \
  "posts/agent-dev/04-unified-entry" "projects/portfolio-site"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/$u")
  echo "$code /$u"
done
kill %1 2>/dev/null; wait 2>/dev/null
```

Expected: **every response 200** (rss/sitemap may serve 200 as XML). Any 404 / 500 needs investigation before commit.

- [ ] **Step 7: Manual visual review**

Open in browser (both dark and light mode via ThemeToggle) and confirm:
- Homepage: SiteHeader, 6-cell series matrix, 10 latest note rows, about card, footer
- `/posts` category tabs actually filter
- `/series/langgraph` shows Chinese title + description + all 7 posts in order
- A random article: mono meta, TOC scroll tracking, series pager
- Dark ↔ Light toggle: all pages retain readable contrast; nothing turns invisible
- Mobile (dev tools 375px): nav collapses gracefully, note rows stack, tags stack

- [ ] **Step 8: Commit any remaining cleanup diff**

```bash
git status --short
```

If there are staged changes from Steps 1-4:
```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: remove legacy palette aliases after full-site migration

Sweep of all *.astro / *.css for lingering var(--brand*), var(--text*),
var(--card*), and hardcoded rgba(201,169,98,*) references. Migrate any
remaining call sites to new tokens (--ink*, --accent, --link,
--bg-elevated, --accent-soft/line). Remove unused alias declarations
from global.css.

Verified: full preview sweep of homepage, posts, series x6, tags,
categories, search, rss, sitemap, 8 article pages, projects page —
all 200. lint + build + test-lib green in both dark and light themes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

If Steps 1-4 produced no changes (all touchpoints were caught in Tasks 1-5), skip the commit and just report "no cleanup diff" to user.

- [ ] **Step 9: Push all 6 commits (or 5-6 depending on Step 8)**

After user confirms visual review is good:

```bash
git log --oneline @{u}..HEAD
```

Expected: 6 commits (or 5 if cleanup was empty), all with `feat:` / `chore:` prefixes matching the 6 tasks.

Push:
```bash
git push origin main
```

- [ ] **Step 10: Post-push CI verification**

Watch GitHub Actions:
```bash
gh run watch --exit-status
```

Or once, non-blocking:
```bash
gh run list --limit 3
```

Expected: latest run is green. If red, investigate via `gh run view <run-id> --log-failed`. Common failures to expect (should NOT happen if local verification passed): Google Fonts CDN timeout, sitemap URL mismatch. Debug and hot-fix if so.

- [ ] **Step 11: Live site smoke test**

Wait ~2 minutes after CI green for GitHub Pages CDN to refresh, then visit https://zhang-llmlab.github.io/ in a fresh browser and click through: homepage → one series → one article → back to homepage. Confirm visual matches local preview.

---

## Plan Self-Review Checklist

Before executing, controller confirms:

1. **Spec coverage** — every spec section maps to a task:
   - §3 Tokens & Typography → Task 1
   - §4 Nav/Header/Footer → Tasks 2 (Nav, Footer) + 3 (SiteHeader consumer)
   - §5 Homepage 3 blocks → Task 3
   - §6 NoteRow / excerpt / tag-chip / SERIES_META / readingTime → Tasks 1 (lib) + 2 (NoteRow, tag-chip)
   - §7.1-7.5 List pages → Task 4
   - §7.6-7.8 Article detail + TOC + Sidebar → Tasks 2 (Sidebar) + 5 (Post, TOC)
   - §8 File touchpoints — all 8 new + 9 modified + 4 small mod + 2 delete + 1 new (/tags/index) all present across tasks
   - §9 Commit plan — Tasks 1-6 match commits 1-6
   - §10 Risks — mitigations embedded (test-lib for sanitize; preview抽验 for palette; hero images preserved)
   - §11 Verification checklist — Task 6 Step 6-7 covers all items

2. **Type consistency** — same names used across tasks:
   - `excerpt(raw, maxLen)` — declared Task 1, used Task 2 (NoteRow), Task 5 (PostLayout) ✓
   - `readingTime(body)` — declared Task 1, used Task 5 (PostLayout) ✓
   - `SERIES_META[slug].title` + `seriesTitle(slug)` — Task 1 → Tasks 3, 4, 5 ✓
   - `<NoteRow>` props — Task 2 → Task 3 (homepage), Task 4 (posts/series) ✓
   - `<CategoryTabs categories>` — Task 2 → Task 4 (posts) ✓
   - `.tag-chip` — Task 2 → Task 4 (tag index chips), Task 5 (post header tags) ✓

3. **Placeholder scan** — none. Every step has actual commands and/or complete code blocks. No "TBD"/"implement later"/"add error handling" placeholders.

4. **User-review gates** — every task ends with "Do NOT push. Stop and hand off to user for preview + review" (matches user's explicit pacing preference).

5. **Rollback safety** — each task is a single commit; `git reset --soft HEAD~1` reverts cleanly. Legacy token aliases in Task 1 ensure any halted mid-migration state remains visually functional.

---

