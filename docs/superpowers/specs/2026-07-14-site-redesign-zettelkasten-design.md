# 全站重设计 · 「笔记者的公开卡片盒」· 设计文档

- 日期：2026-07-14
- 项目：`zhang-llmlab.github.io`（Astro + MDX）
- 目标：跳出通用 tech-blog 模板感，把站点定位为一个精心维护的、内容优先的技术 Zettelkasten

---

## 1. 背景与问题

上一轮 impeccable audit 打分 15/20（Anti-Patterns 2/4），polish 已修 6 项 P1/P2 defects。首页看着仍然"内容少 + 不精美"：

- Hero 是用户放的 4 张动漫/风景图，与技术博客身份不匹配
- Stats 显示 `32 文章 / 1 项目`，中间空一列布局松散
- 文章卡片 description 直接渲染原始 markdown（表格管道、blockquote 标记）
- "精选项目" 只有 1 张卡显得空旷
- 关键词区大量彩色 pill 分量过重，喧宾夺主
- 整体视觉是"warm-gold on near-black" —— 2024-2026 tech-blog AI 默认调色
- 缺乏 POV，看不出作者是谁、这个站主打什么

用户明确说：不介意重构项目，希望整站视觉观感提升，让首页看起来内容饱满、有 POV。

---

## 2. 关键决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| 改造范围 | **全站重构**（首页 + 卡片体系 + 列表页 + 文章详情 + Nav + Sidebar） | 用户明确 opt-in |
| 站点 POV | **「笔记者的公开卡片盒」**（Zettelkasten） | 契合已有内容形态（小块知识 + 系列展开） |
| Hero 处理 | **完全删除** HomeHero + typed.js | 与 Zettelkasten 冷静气质不符；图片保留在原位不删 |
| 摘要处理 | **运行时 sanitize** | 不改内容，避免手工重写 8-10 篇 |
| 字体策略 | 保留中文字栈 + **引入 JetBrains Mono** | Mono 是"笔记本"识别信号；单文件 ~40KB Latin subset |
| 配色 | **全新调色：Ink & Phosphor**（陶土红 + 松花青 + 冷灰墨黑） | 用户 opt-in 摆脱现有暖金；避开 AI 默认与 saturated 雷区 |
| /posts 页 | 加 **category 筛选 tab** | 33 篇后需要更强导航 |
| /series/[series] | 保持**宽栏** | 用户偏好 |
| 执行方式 | **6 分阶段 commit**，每次 push 前 preview 抽验，用户 review 后放行 | 大改造需要观察节点 |
| Hero 图片 | **保留不删** | 用户无备份 |

---

## 3. Design Tokens & Typography

### 3.1 全新配色 · Ink & Phosphor（OKLCH）

**设计意图**：冷灰墨底（比纯黑温和）+ 暖白墨字（像老纸黄化后的余温）+ 陶土手写标注色 + 钢笔松花青链接。committed 但不喧闹。

```css
:root {
  color-scheme: dark;

  /* 底色 —— 冷灰 near-black，微蓝 */
  --bg:          oklch(15% 0.008 245);
  --bg-elevated: oklch(19% 0.010 245);
  --bg-soft:     oklch(23% 0.012 245);

  /* 墨迹 —— 暖白 */
  --ink:      oklch(93% 0.015 85);
  --ink-soft: oklch(72% 0.015 85);
  --ink-mute: oklch(52% 0.012 85);

  /* 主 accent —— 陶土红 / 烧赭石 */
  --accent:      oklch(68% 0.14 45);
  --accent-soft: oklch(68% 0.14 45 / 0.14);
  --accent-line: oklch(68% 0.14 45 / 0.35);

  /* 次 accent —— 松花青（链接 / "当前"标记） */
  --link:       oklch(74% 0.11 195);
  --link-hover: oklch(82% 0.12 195);

  /* 分隔线 */
  --line:        oklch(35% 0.008 245 / 0.55);
  --line-strong: oklch(45% 0.010 245 / 0.75);
}

html[data-theme="light"] {
  color-scheme: light;
  --bg:          oklch(97% 0.005 90);
  --bg-elevated: oklch(99% 0.003 90);
  --bg-soft:     oklch(94% 0.008 90);
  --ink:         oklch(22% 0.015 245);
  --ink-soft:    oklch(40% 0.015 245);
  --ink-mute:    oklch(52% 0.012 245);
  --accent:      oklch(52% 0.14 40);
  --accent-soft: oklch(52% 0.14 40 / 0.10);
  --accent-line: oklch(52% 0.14 40 / 0.30);
  --link:        oklch(48% 0.12 210);
  --link-hover:  oklch(40% 0.14 210);
  --line:        oklch(60% 0.008 245 / 0.30);
  --line-strong: oklch(50% 0.010 245 / 0.45);
}
```

对比度校验（暗色主题）：
- `--ink` on `--bg`：13.8:1（AAA pass）
- `--ink-soft` on `--bg`：8.4:1（AAA pass）
- `--ink-mute` on `--bg`：4.6:1（AA pass）
- `--link` on `--bg`：8.9:1（AAA pass）

### 3.2 字体

- 中文栈保留（Noto Sans SC / PingFang SC / Hiragino Sans GB）
- 拉丁字栈保留（system-ui / -apple-system / …）
- 新增 **JetBrains Mono** 通过 Google Fonts CDN 加载 Latin 400/500/600 三个字重
- Mono 语义约定：卡片 meta 行的日期、阅读时长、series slug（英文识别符）、tag chip 文字、导航中英文 logo 字部分、页面 meta 中的数字

```css
--font-sans: "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
             -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
```

### 3.3 尺度 tokens

```css
--fs-xs:   0.78rem;        /* meta */
--fs-sm:   0.88rem;        /* body-small */
--fs-base: 1rem;           /* body */
--fs-lg:   1.15rem;        /* card title */
--fs-xl:   1.4rem;         /* section head */
--fs-2xl:  clamp(1.75rem, 3vw, 2.3rem);  /* page title */

--sp-1: 0.25rem; --sp-2: 0.5rem;  --sp-3: 0.75rem;
--sp-4: 1rem;    --sp-5: 1.5rem;  --sp-6: 2rem;
--sp-7: 3rem;    --sp-8: 4rem;

--radius:    14px;   /* 承接 impeccable polish 之后的值，不再改 */
--radius-lg: 18px;
```

---

## 4. 站点导航（Nav + Header + Footer）

### 4.1 Nav（顶部固定）
- 高度 56px，非 overlay
- Logo：`zhang-llmlab`（JetBrains Mono medium 500）+ 前置一个 8×8 陶土色小方块作签名 mark
- 菜单项：`首页 · 文章 · 专题 · 作品集 · 搜索`（`--fs-sm`, `--ink-soft`, hover → `--ink`）
- 当前页高亮：字下 2px `--accent` 短线
- ThemeToggle：简化到 12×12 SVG，无边框无背景
- Mobile：菜单折叠为汉堡

### 4.2 首页 SiteHeader（替代 HomeHero）
约 160px 高的名片式站头：

```
zhang-llmlab
─── (8em accent line)
记录一位工程师的技术心智：机器学习、Agent 工程、Harness。
33 篇笔记 · 6 个专题 · 最后更新 2026-07-14
```

- 站名：`--fs-2xl`，700，`--ink`
- 一句话自介：`--fs-base`，`--ink-soft`，max-width 46ch
- 统计行：mono，`--fs-sm`，`--ink-mute`，数字以 `--accent` 高亮

### 4.3 Footer
```
zhang-llmlab · 2024-2026
RSS · GitHub · 站点地图
```

- 全 `--ink-mute`，`--fs-xs`
- 版权行年份用 mono
- 分隔用 `·`，无 border

---

## 5. 首页结构（编辑型索引）

删掉 sidebar；全宽内容；3 大块：

### Block 1 · 专题矩阵（Series Matrix）
- `repeat(auto-fit, minmax(280px, 1fr))` 网格，desktop 3 列
- 每格：`slug · count`（mono）+ 中文 title + 最新 3 篇（`· NN · title`）+ `查看专题 →` 链接
- hover 时格边界 → `--accent-line`，translateY(-2px)
- 陶土 accent 只在短横线出现，避免每格花哨

### Block 2 · 最新笔记（10 条）
- 用 `NoteRow` 组件（§6.1 详述）
- 无 box，用 hairline 分隔
- 页脚：`查看全部 33 篇 →`

### Block 3 · 关于
一张窄卡（max-width 640px）：

```
[头像 56×56]  zhang-llmlab
              工程师 · 记录学习、复盘、工具用法

              领域：AI 算法 · Agent 工程

              GitHub  ·  RSS
```

- 头像圆形
- name `--fs-lg` bold
- bio `--fs-sm` `--ink-soft`
- 领域行：mono，前缀 "领域：" `--ink-mute`
- 链接 mono `--fs-sm` `--link`，中间 `·`

---

## 6. 组件系统

### 6.1 NoteRow.astro（新增，全站复用）

三处复用：首页 Block 2、`/posts` 列表、`/series/[series]` 列表。

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
  variant?: "index" | "detail";
}
```

视觉：
```
2026-07-14  Skills 跨框架实践：标准化程度与在不同框架中的用法      skills·03
            结论先说：Skills 不是行业标准…                       [Skill]
─────────────────────────────────────────────────────────────
```

- Grid `6.5rem 1fr`：日期左列固定宽（对齐），内容右列
- Hairline 分隔：`.note-row + .note-row { border-top: 1px solid var(--line); }`
- Padding：`--sp-4 0`
- Title hover → `--accent`，无 transform / background 变化
- Focus-visible：整行为 `<a>`，键盘可完整选中
- Series 徽标 `slug·NN` 在右上角，mono
- 摘要经 `excerpt()` 处理后 1 行 truncate
- Tag chips 一行 2-3 个（多余隐藏）

### 6.2 excerpt() · src/lib/text.ts（新增）

```ts
export function excerpt(raw: string | undefined, maxLen = 120): string {
  if (!raw) return "";
  let s = raw
    .replace(/```[\s\S]*?```/g, "")           // fenced code
    .replace(/`([^`]+)`/g, "$1")              // inline code
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")     // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // links → anchor text
    .replace(/^\s*[>|#\-*+]+\s*/gm, "")       // block markers
    .replace(/\*\*|__|~~|\*/g, "")            // bold / italic / strike
    .replace(/\|/g, " ")                      // table pipes
    .replace(/^\s*-{3,}.*$/gm, "")            // table separator rows
    .replace(/\s+/g, " ")                     // collapse whitespace
    .trim();
  if (s.length > maxLen) s = s.slice(0, maxLen).trimEnd() + "…";
  return s;
}
```

### 6.3 tag-chip 类（替代旧 `.tag`）

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
  transition: color 0.15s, border-color 0.15s;
}
a.tag-chip:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}
```

方形微圆角、mono、无染底 —— 视觉分量比旧 `.tag`（圆润 pill + 暖金染底）大幅降低。

### 6.4 SERIES_META · src/lib/series-meta.ts（新增）

```ts
export const SERIES_META: Record<string, { title: string; description?: string }> = {
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
```

所有显示 series 的地方（首页 Block 1、`/series` 大格、`/series/[series]` 头部、文章详情页专题名）都从这个 map 读，避免 hardcode。

### 6.5 readingTime() · src/lib/reading-time.ts（新增）

```ts
export function readingTime(body: string): number {
  const cn = (body.match(/[一-鿿]/g) ?? []).length;
  const en = (body.match(/[a-zA-Z]+/g) ?? []).length;
  const minutes = Math.ceil(cn / 300 + en / 250);
  return Math.max(1, minutes);
}
```

- 中文按 300 字/分钟
- 英文按 250 词/分钟
- 最少 1 分钟

---

## 7. 列表页 & 文章详情页

### 7.1 `/posts`
- h1 `文章`（`--fs-2xl`）+ meta `共 33 篇 · 6 个专题`
- **新增 CategoryTabs 组件**：一行水平 tab，`全部 · 机器学习 · 深度学习 · LLM 应用 · Agent 框架 · Agent 工程 · 强化学习 · 工具与笔记`，点击后 `?category=xxx` 客户端 filter；移动端可横滑
- 主体：`NoteRow` 全量按时间倒序
- 保留右侧 Sidebar

### 7.2 `/series`
- h1 `专题`
- 6 个大格子（比首页 Block 1 更大），单列全宽
- 每格显示：`slug · count` + 中文 title + description（若 SERIES_META 有）+ **全部文章列表**

### 7.3 `/series/[series]`（宽栏，不用窄栏）
- h1 从 SERIES_META 读中文 title
- meta 行 mono：`langgraph · 7 篇 · 首发 YYYY-MM-DD · 最后更新 YYYY-MM-DD`
- description（若 SERIES_META 有）
- `NoteRow` 按 seriesOrder 升序

### 7.4 `/tags/[tag]`
- h1 从 `关键词：xxx` → `#xxx`
- `NoteRow` 简化版（只 date + title，无 excerpt）
- 底部：`相关标签`（同现频次最高的 3-5 个）

### 7.4.1 `/tags`（新增，标签总览）
- h1 `标签`
- 主体：按出现频次降序列出所有 tag，每个 tag 显示 `#name (N)`（mono）
- 布局：flex-wrap，tag-chip 语言
- Sidebar 的"更多 →"链到这里

### 7.5 `/categories/[category]`
- 结构同 `/tags/[tag]`
- h1 `分类：xxx`

### 7.6 文章详情页（PostLayout）

Header 区改为 mono 分点：
```
2026-07-14 · Agent 工程 · 阅读时长约 8 分钟
──
Harness 工程概念：把 LLM 变成 Agent 的"外壳"
Harness（工程外壳）是包裹在 LLM 外面的运行时环境…
[Harness] [Runtime] [工程外壳] [LLM 应用]
所属专题：Harness 工程 (harness · 01)
```

- Meta 行全 mono，`--ink-mute`
- 短线 8em `--accent-line`
- Series 名从 SERIES_META 读中文 title
- 阅读时长通过 `readingTime(body)` 计算

Series-nav 卡（"本专题文章"）：
- 标题：`series · 6 篇` (mono, `--ink-mute`) + 中文 title
- 列表项：`01 · title`（mono 前缀 + 中文），无 `<ol>` 编号
- 当前项：整行 bg `--accent-soft`，无粗体

Series-pager（上下篇导航）：
- 无边框方框，只上分割线 + 中央 vertical `--line`
- 前缀 `← 上一篇` / `下一篇 →`（mono, `--ink-mute`）
- 标题字 `--ink`，hover → `--accent`

### 7.7 ArticleToc（左侧粘性目录）
- 去掉现在的 `border-left` 色条（audit 保留过但换 palette 后不和谐）
- 每项前置 `·`（mono）
- Depth 用缩进表示
- 当前节 title `--accent`，其他 `--ink-soft`
- TOC 顶部：`目录`（mono 500，`--fs-xs`，`--ink-mute`）

### 7.8 Sidebar（右侧）
去卡片外壳，直接贴在 layout 里：

```
专题
langgraph      7
pytorch        4
ml-basics      9
agent-dev      5
skills         3
harness        3
──
热门标签
Harness  Multi-Agent
LangGraph  Skill
...
更多 →
```

- 分区之间用 `--line` hairline
- Series 列表按篇数降序
- Tags 只显 12-15 个（出现频次 top），"更多 →" 链去 `/tags`
- **首页不显示 sidebar**，只在文章详情、`/posts`、`/tags/*`、`/categories/*` 显示

---

## 8. 文件级改动清单

### 新增（8 个）
- `src/lib/text.ts` — excerpt() sanitize
- `src/lib/series-meta.ts` — SERIES_META
- `src/lib/reading-time.ts` — readingTime()
- `src/components/NoteRow.astro`
- `src/components/SiteHeader.astro`
- `src/components/SiteFooter.astro`
- `src/components/CategoryTabs.astro`
- `src/pages/tags/index.astro` — 全部标签总览页（Sidebar 的"更多 →"跳转目标；按频次列出）

### 大改（9 个）
- `src/styles/global.css`
- `src/pages/index.astro`
- `src/pages/posts/index.astro`
- `src/pages/series/index.astro`
- `src/pages/series/[series].astro`
- `src/components/Sidebar.astro`
- `src/components/Nav.astro`
- `src/components/ArticleToc.astro`
- `src/layouts/PostLayout.astro`

### 小改（4 个）
- `src/pages/tags/[tag].astro`
- `src/pages/categories/[category].astro`
- `src/styles/prose.css`
- `src/layouts/BaseLayout.astro`

### 删除（2 项）
- `src/components/HomeHero.astro`
- `package.json` 里 `typed.js` 依赖 + `package-lock.json` 相关条目

### 完全不动
- `src/content/**` — 33 篇文章
- `src/content/config.ts`
- `scripts/lint-content.mjs`
- `astro.config.mjs`
- `.github/workflows/deploy.yml`
- `public/images/main_page_images/**` — **保留不删**（用户无备份）

---

## 9. 分阶段 Commit 计划

按依赖 + 可验证性拆 6 个 commit。每次 push 前 `npm run preview`，用户 review 后放行下一个。

### Commit 1 — Tokens & 字体基础
- 新 `global.css`（Ink & Phosphor palette + tokens）
- `BaseLayout.astro` 加 JetBrains Mono `<link>`
- 新 `src/lib/text.ts` / `series-meta.ts` / `reading-time.ts`
- 验证：`npm run build` 通过；页面能加载

### Commit 2 — 卡片语言 + Site chrome
- 新 `NoteRow.astro` / `SiteHeader.astro` / `SiteFooter.astro` / `CategoryTabs.astro`
- 改 `Nav.astro` / `Sidebar.astro`
- `global.css` 加 `.tag-chip`
- 验证：build 通过；chrome 已换新

### Commit 3 — 首页重写
- 改 `src/pages/index.astro`（3-block + SiteHeader）
- 删 `src/components/HomeHero.astro`
- `package.json` 卸载 `typed.js`
- 验证：首页最终效果；其他页面仍能访问

### Commit 4 — 列表页迁移
- 改 `src/pages/posts/index.astro`（NoteRow + CategoryTabs）
- 改 `src/pages/series/index.astro`（大格子）
- 改 `src/pages/series/[series].astro`（NoteRow + SERIES_META）
- 改 `src/pages/tags/[tag].astro` + `src/pages/categories/[category].astro`
- 新 `src/pages/tags/index.astro`
- 验证：所有列表页视觉迁移；仍可点进文章

### Commit 5 — 文章详情页
- 改 `src/layouts/PostLayout.astro`
- 改 `src/components/ArticleToc.astro`
- 改 `src/styles/prose.css`（换 palette）
- 验证：抽验 5 篇文章；阅读时长正确

### Commit 6 — 清理
- 修任何 preview 抽验发现的遗留 issue
- 验证 `npm run build && npm run preview`，抽验 10+ 页面
- push

**顺序不可颠倒**：C2-3 依赖 C1 的 tokens；C4-5 依赖 C2 的 NoteRow。

---

## 10. 风险 & 回滚

| 风险 | 缓解 |
|---|---|
| 新 palette 视觉观感不符预期 | 每 commit 后 preview；Commit 1 后可停下评估是否要调 |
| JetBrains Mono 加载失败 / FOIT | `display=swap` + fallback ui-monospace |
| Sanitize 漏 markdown 语法 | text.ts 单元测试 5-8 case 兜底 |
| Sidebar 去卡片后视觉太"裸" | Commit 2 后立即观察，可回滚仅那一处 |
| 删 HomeHero 影响其他引用 | `grep -rn 'HomeHero\|typed' src/` 确认清 0 |
| 用户想恢复 hero 但图丢了 | 图保留在原位；`git show <sha>:src/components/HomeHero.astro` 恢复代码 |
| 生产上旧图片链接 404 | 检查 3 处非 hero `/images/` 引用（avatar 在 `public/images/avatar.svg` 保留） |

---

## 11. 验证清单

Commit 6 完成后，人工核对：

- [ ] `npm run build` 无错误
- [ ] `npm run preview` 首页显示新版
- [ ] 6 个 Series 矩阵卡都正确显示 count + 前 3 条
- [ ] 最新笔记 10 条日期对齐、excerpt 无 markdown 残留
- [ ] Block 3 关于卡 layout 正确
- [ ] `/posts` 33 篇全显示 + category tab 切换正常
- [ ] `/series` 6 大格显示所有文章
- [ ] `/series/langgraph` 使用中文 title + description
- [ ] 抽验 5 篇文章：header 新样式、tag-chip 新样式、series-nav 新样式、series-pager 新样式
- [ ] TOC 无左侧色条，改用 `·` 前缀
- [ ] `/tags/Harness` 使用 `#Harness` 样式 + 相关标签
- [ ] `/search` Pagefind UI 用新调色
- [ ] 阅读时长在文章 header 正确显示
- [ ] Dark ↔ Light 切换所有页面对比正常
- [ ] 移动端（<560px）nav 折叠、列表 stack 正常
- [ ] 键盘 tab 遍历 NoteRow / tag-chip / nav 有 focus outline
- [ ] Preview `curl -s -o /dev/null -w "%{http_code}"` 抽 10+ 页面均 200
- [ ] `node scripts/lint-content.mjs` 无内容错误
