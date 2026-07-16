# 发布说明文档

如何在本站新建笔记、图片、专题（series），以及推送发布的完整流程。

> 本文档跟随代码版本更新；若你看到与实际不符的地方，以 `src/content/config.ts` 和 `src/lib/series-meta.ts` 为准。

---

## TL;DR

```bash
# 1. 新建文件（示例：ml-basics 系列的第 10 篇）
touch src/content/posts/ml-basics/10-my-topic.mdx

# 2. 写 frontmatter + 正文（frontmatter 见下）

# 3. 本地预览
npm run dev
# → http://localhost:4321/posts/ml-basics/10-my-topic

# 4. 三绿再推
node scripts/lint-content.mjs
node scripts/test-lib.mjs
npm run build

# 5. push
git add src/content/posts/ml-basics/10-my-topic.mdx
git commit -m "post(ml-basics): 添加 XX 笔记"
git push origin main
```

推送后 GitHub Actions 自动部署，1-2 分钟后 https://zhang-llmlab.github.io/ 生效。

---

## 1. 目录结构与放置规则

所有文章都放在 `src/content/posts/` 下，**必须**位于某个 series 子目录或 `misc/` 里，不能平铺在 `posts/` 根目录。

```
src/content/
├── _templates/                     ← 模板文件（下划线前缀 Astro 忽略）
│   └── knowledge-blog.mdx
├── posts/
│   ├── langgraph/                  ← series: langgraph
│   ├── pytorch/                    ← series: pytorch
│   ├── ml-basics/                  ← series: ml-basics
│   ├── agent-dev/                  ← series: agent-dev
│   ├── skills/                     ← series: skills
│   ├── harness/                    ← series: harness
│   └── misc/                       ← 不属于任何 series 的零散篇
└── projects/                       ← 作品集（本文暂不涉及）
```

### 归属决策树

| 笔记内容主题 | 放在哪 | 文件名规则 |
|---|---|---|
| LangGraph / 智能体工作流编排 | `posts/langgraph/` | `NN-slug.mdx`（如 `08-my-note.mdx`） |
| PyTorch 深度学习基础 | `posts/pytorch/` | `NN-slug.mdx` |
| 机器学习原理 / 经典算法 | `posts/ml-basics/` | `NN-slug.mdx` |
| Agent 开发实践 / 框架对比 | `posts/agent-dev/` | `NN-slug.mdx` |
| Anthropic Skills 协议 | `posts/skills/` | `NN-slug.mdx` |
| Harness 工程 / Claude Code 实现 | `posts/harness/` | `NN-slug.mdx` |
| **属于新的方向、暂时只有 1-2 篇** | `posts/misc/` | `slug.mdx`（不加编号） |
| **已经会写 3+ 篇的新方向** | **需要新建 series**（见 §5） | `NN-slug.mdx` |

### 命名规则

- **必须英文 kebab-case**：`08-tensor-basics.mdx` ✓，`08张量基础.mdx` ✗（中文文件名会被 URL 编码成 `%E5%BC%A0...`，不能分享）
- **series 内加两位数字前缀**：`08-` 而不是 `8-` —— 排序稳定、TOC 好看
- **编号必须紧接上一篇**：不能跳号、不能重复（`lint-content.mjs` 会拦截）
- **`misc/` 不加编号**：直接 `slug.mdx`
- **中文标题在 frontmatter 的 `title` 字段里**：文件名英文，标题中文，两不冲突

---

## 2. Frontmatter 完整字段说明

### 必填字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 中文人类可读标题 |
| `pubDate` | date | 首发日期，`YYYY-MM-DD` |
| `category` | enum | **必须是 7 个枚举之一**（见下） |

### Category 枚举（拼错编译时报错）

- `机器学习`
- `深度学习`
- `LLM 应用`
- `Agent 框架`
- `Agent 工程`
- `强化学习`
- `工具与笔记`

### 可选字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `description` | string | 一句话摘要。**允许含 markdown**，卡片显示时会自动 sanitize |
| `updatedDate` | date | 最近更新日期；若没改过内容可省略 |
| `series` | enum | 6 个 series 之一（见下）；不属于 series 的省略 |
| `seriesOrder` | positive int | series 内的序号；**`series` 存在则必填** |
| `tags` | string[] | 自由多标签；与 category 同名的会被剥去 |
| `level` | enum | `beginner` / `intermediate` / `advanced` |
| `audience` | string[] | 目标读者 |
| `keywords` | string[] | SEO 关键词（跟 tags 相似但侧重搜索匹配） |
| `toc` | boolean \| `"inline"` | 默认 `true`（左侧粘性目录）；`"inline"` 是文首块状目录；`false` 完全关闭 |
| `draft` | boolean | 默认 `false`。**`true` 时线上不显示**，写完记得改回 `false` |
| `cover` | string | 封面图路径。若给了则文件必须真实存在（lint 会检查） |

### Series 枚举（拼错编译时报错）

`langgraph` / `pytorch` / `ml-basics` / `agent-dev` / `skills` / `harness`

### Frontmatter 模板 · 属于 series 的笔记

```yaml
---
title: "梯度消失与梯度爆炸"
description: "深层网络训练中最常见的两类数值问题：原因、检测方法、常用缓解手段（归一化、残差连接、梯度裁剪）。"
pubDate: 2026-07-15
updatedDate: 2026-07-15
category: "深度学习"
series: "pytorch"
seriesOrder: 5
tags: ["梯度消失", "梯度爆炸", "反向传播", "训练稳定性"]
level: "intermediate"
audience: ["深度学习学习者"]
draft: false
---

正文从这里开始……
```

### Frontmatter 模板 · misc（零散笔记）

```yaml
---
title: "vim 编辑技巧速查"
description: "日常常用的 vim 命令与配置片段。"
pubDate: 2026-07-15
category: "工具与笔记"
tags: ["vim", "编辑器"]
draft: false
---
```

---

## 3. 图片：粘贴、路径、referencing

### 3.1 编辑器里贴图（推荐流程）

前提：VS Code / Cursor 安装了 **Paste Image** 扩展（`mushan.vscode-paste-image`）；工作区 `.vscode/settings.json` 已配置好粘贴路径规则。

操作：

1. **先保存当前 `.mdx` 文件**（未保存无法确定目录）
2. 截图或复制图片到剪贴板
3. 在文章任意位置按 **Ctrl+Alt+V**（或用系统的 Ctrl+V，取决于哪个先响应）
4. 图片自动落到 `与当前文件同目录、以文章文件名为名的子文件夹`。举例：
   - 当前文件：`src/content/posts/ml-basics/08-knn.mdx`
   - 图片会保存到：`src/content/posts/ml-basics/08-knn/xxx.png`
   - MDX 里自动插入：`![](./08-knn/xxx.png)`

### 3.2 手动引用图片

若你在外面处理好图片再拷进来，遵循同样的目录约定：

```mdx
![KNN 决策边界示意](./08-knn/knn-decision.svg)
```

### 3.3 封面 cover

Frontmatter 里的 `cover` 字段用**站点根路径**，图放到 `public/covers/`：

```yaml
cover: "/covers/my-post-cover.jpg"
```

对应文件：`public/covers/my-post-cover.jpg`（构建时会打包）。若 `cover` 引用了不存在的文件，`lint-content.mjs` 会挂。

### 3.4 图片校验

`node scripts/lint-content.mjs` 会检查：
- 每个 frontmatter 的 `cover` 若有值，则对应文件必须存在
- 每个 `![...](./xxx/yyy.png)` 相对引用，文件必须存在

---

## 4. 命令速查

### 写作阶段

```bash
# 起本地 dev server（热重载）
npm run dev
# 打开 http://localhost:4321/posts/<series>/<slug>
```

### Commit 前必跑（三绿检查）

```bash
node scripts/lint-content.mjs   # 内容完整性检查
node scripts/test-lib.mjs        # 17 case 工具函数单元测试
npm run build                    # 完整构建（frontmatter 拼错这里挂）
```

**任意一个红 → 不要 commit**，看错误信息改内容/frontmatter 再来。

### 发布到线上

```bash
git add src/content/posts/<你的文件>
git commit -m "post(<series>): <标题简写>"
git push origin main
```

推送后：
- GitHub Actions 会自动跑 `Install → Type-check → Test lib → Lint content → Build → Deploy to Pages`
- 全绿约 1-2 分钟，线上 https://zhang-llmlab.github.io/ 自动更新
- 挂了看 Actions 日志

---

## 5. 新建 series（专题）

**能新建，但需要改代码**。原因：schema 用 zod enum 强约束了 series 集合，写死避免拼错和散养。

### 决定要不要新建 series 的判断

- **暂时只有 1-2 篇** → 放 `misc/`，别急着抽 series
- **计划写 3+ 篇，主题聚合明确** → 值得新建 series
- **是现有 series 的进阶补充** → 直接续 `NN-` 编号即可，无需新建

### 3 步新建流程

假设要新建一个 `nlp` 系列（自然语言处理）。

#### Step 1 · 在 `src/content/config.ts` 加 series slug

```diff
 const SERIES = [
   "langgraph",
   "pytorch",
   "ml-basics",
   "agent-dev",
   "skills",
-  "harness"
+  "harness",
+  "nlp"
 ] as const;
```

#### Step 2 · 在 `src/lib/series-meta.ts` 加中文 title + description

```diff
 export const SERIES_META: Record<string, SeriesMetaEntry> = {
   // ... 现有 6 个 ...
+  nlp: {
+    title: "NLP 与文本处理",
+    description: "分词、词向量、文本分类到 Transformer 的原理与实现。"
+  }
 };
```

#### Step 3 · 建目录 + 写第一篇

```bash
mkdir -p src/content/posts/nlp
touch src/content/posts/nlp/01-tokenization.mdx
```

Frontmatter：
```yaml
---
title: "分词方法总览"
description: "从 whitespace 到 BPE，主流分词策略对比。"
pubDate: 2026-07-15
category: "深度学习"          # 从 7 个 category 里选一个跟内容匹配的
series: "nlp"                # ← 用新 series 的 slug
seriesOrder: 1
tags: ["分词", "BPE", "Tokenizer"]
draft: false
---
```

#### Step 4 · 三绿 + push

```bash
node scripts/lint-content.mjs
node scripts/test-lib.mjs
npm run build

git add src/content/config.ts src/lib/series-meta.ts src/content/posts/nlp/
git commit -m "feat: add nlp series with first post on tokenization"
git push origin main
```

**验证效果**：
- 首页"专题矩阵"会新增 nlp 格子
- `/series` 页面新增 nlp 大格
- `/series/nlp` 可访问，显示中文 title `NLP 与文本处理`
- Nav 或 Sidebar 里的 series 列表自动加入 nlp（按篇数排序）

### 新建 category（更罕见）

如果你的新方向连现有 7 个 category 都装不下，需要在 `src/content/config.ts` 里加：

```diff
 const CATEGORIES = [
   "机器学习",
   "深度学习",
   "LLM 应用",
   "Agent 框架",
   "Agent 工程",
   "强化学习",
-  "工具与笔记"
+  "工具与笔记",
+  "系统工程"
 ] as const;
```

**注意**：只有新方向真的跟现有 7 个都不契合时才加；否则应尽量映射到现有 category 保持视觉一致性。

---

## 6. 常见错误速查

### Build 阶段的报错与解决

| 报错关键词 | 原因 | 解决 |
|---|---|---|
| `InvalidContentEntryDataError` + `Expected '机器学习' \| ...` | `category` 拼错或没在枚举里 | 改成 7 个枚举之一 |
| `InvalidContentEntryDataError` + `Expected 'langgraph' \| ...` | `series` 拼错或没在枚举里 | 改成 6 个枚举之一，或加新 series（§5） |
| `series 和 seriesOrder 必须同时存在或同时缺失` | 一个填了一个没填 | 补上另一个，或两个都删 |
| `Expected number, received string` | `seriesOrder` 加了引号 | 去掉引号：`seriesOrder: 5` 不是 `"5"` |
| `Expected date` | `pubDate` 格式不对 | 用 `YYYY-MM-DD`，不要 `2026/7/15` |

### Lint 阶段的报错与解决

| 报错关键词 | 原因 | 解决 |
|---|---|---|
| `slug 重复` | 两篇文章 slug 相同 | 换文件名 |
| `series 'xxx' 的 seriesOrder 缺号` | 断号（如有 1,2,4 缺 3） | 补上或调整编号 |
| `series 'xxx' 的 seriesOrder 重复` | 两篇同 series 同 order | 改其中一个的号 |
| `cover 图不存在: /covers/xxx.jpg` | frontmatter cover 路径错 | 检查 `public/covers/xxx.jpg` 是否真存在 |
| `内文图片不存在: ./xxx/yyy.png` | MDX 里引用了不存在的图 | 检查目录名和文件名 |

### 视觉问题（build 通过但显示不对）

| 现象 | 原因 | 解决 |
|---|---|---|
| 卡片标签区显示 `—`（空） | 该 post 的 `tags` 和 `keywords` 都是空 | 加 `tags: ["xxx"]` 或 `keywords: ["xxx"]` |
| 文章不显示在列表里 | `draft: true` | 改成 `draft: false` |
| 首页专题矩阵没显示新 series | Task 1 加 series slug 后忘了 SERIES_META | 补 `src/lib/series-meta.ts` |
| 文章卡片摘要显示 `**xxx**` 星号 | 不会 —— sanitize 会剥去 | 若真出现，说明 `description` 用了非标 markdown 语法 |
| 图片贴不进去 | 未先保存 mdx 文件 | 先 Ctrl+S，再 Ctrl+Alt+V |

---

## 7. 三个完整实操场景

### 场景 A · 在已有 series 续写一篇（最常见）

```bash
# 假设：ml-basics 系列现在有 1-9 共 9 篇，你想加第 10 篇
touch src/content/posts/ml-basics/10-gradient-descent.mdx
```

frontmatter：
```yaml
---
title: "梯度下降与优化器"
description: "从 SGD 到 Adam 的演进：为什么、区别、何时用哪个。"
pubDate: 2026-07-15
category: "机器学习"
series: "ml-basics"
seriesOrder: 10
tags: ["梯度下降", "SGD", "Adam", "优化器"]
draft: false
---

# 梯度下降与优化器

## 一、SGD 基础

……正文
```

三绿 → commit → push。完成。

### 场景 B · 加一篇不属于任何 series 的散文

```bash
touch src/content/posts/misc/why-i-use-tmux.mdx
```

```yaml
---
title: "为什么我用 tmux 而不是终端多标签"
description: "对比 iTerm2 tabs 和 tmux 会话的差异，以及远程开发场景下的优势。"
pubDate: 2026-07-15
category: "工具与笔记"
tags: ["tmux", "终端", "工作流"]
draft: false
---
```

三绿 → commit → push。完成。**注意 `misc/` 不加数字编号**，也不写 `series` / `seriesOrder`。

### 场景 C · 新建一个全新 series 并写第一篇

参考上面 §5 的 4 步流程。**关键点**：改 schema + 加 SERIES_META 要跟第一篇文章一起 commit，否则 build 会挂。

---

## 8. 附：修改现有文章

- 修改内容 → 更新 `updatedDate` 字段（可选但推荐）
- 修改 slug（改文件名）→ **URL 会变**，会破坏外链和搜索引擎索引。避免。若一定要改，加 astro redirect
- 删文章 → 直接 `git rm`，不要留空文件
- 迁移文章到另一个 series → 就是"改路径"，同样会改 URL，避免

---

## 9. 校验清单（每次发布前过一遍）

- [ ] 文件在正确的 series 子目录或 `misc/` 下
- [ ] 文件名英文 kebab-case + 可选 `NN-` 前缀
- [ ] `title` 是中文人类可读
- [ ] `pubDate` 是 `YYYY-MM-DD` 格式
- [ ] `category` 是 7 个枚举之一
- [ ] 若有 `series` 则 `seriesOrder` 也有，且不断号不重复
- [ ] `tags` 别与自己的 category 同名（会被过滤）
- [ ] 若有 `cover` 则对应文件真实存在于 `public/covers/`
- [ ] 正文里的 `![](./xxx/yyy.png)` 引用文件真实存在
- [ ] `draft: false`
- [ ] 三绿都过：`lint-content.mjs` + `test-lib.mjs` + `npm run build`
- [ ] 本地 `npm run dev` 打开文章预览、卡片显示、tag 链接、series 页都无异常
