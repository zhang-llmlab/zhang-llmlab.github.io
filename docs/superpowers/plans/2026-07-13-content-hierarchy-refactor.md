# 博客文章管理层级重构 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 34 个平铺的 `.mdx`（含 1 个待删模板）迁移成按 series 分子目录的清晰结构，收紧 schema 用 enum 拦截拼错，并加 CI 内容 lint。

**Architecture:** 分 4 个 phased commit：(1) 清理 + schema 收紧、(2) frontmatter 规范化、(3) 物理迁移 + URL 变更、(4) CI 与 lint。前两 commit 必须一起推送（Commit 1 会临时打破 build，Commit 2 恢复）。

**Tech Stack:** Astro 5 + MDX + Astro Content Collections (zod schema) + Pagefind + GitHub Actions

**Spec reference:** [docs/superpowers/specs/2026-07-13-content-hierarchy-refactor-design.md](../specs/2026-07-13-content-hierarchy-refactor-design.md)

## Global Constraints

- **URL 兼容**：干净重构，不保留旧 URL（用户已确认接受 SEO/外链损失）
- **文件命名**：英文 kebab-case + 可选 `NN-` 编号前缀；中文标题保留在 frontmatter `title` 字段
- **Category 枚举（固定 7 值）**：`机器学习` / `深度学习` / `LLM 应用` / `Agent 框架` / `Agent 工程` / `强化学习` / `工具与笔记`
- **Series 枚举（固定 6 值）**：`langgraph` / `pytorch` / `ml-basics` / `agent-dev` / `skills` / `harness`
- **图片文件名**：只跟目录搬迁，文件本身不重命名（减少内文引用改动出错面）
- **保留字段**：`title` / `description` / `pubDate` / `updatedDate` / `draft` / `cover` / `level` / `audience` / `keywords` / `toc` 一律不动
- **提交约束**：Commit 1（schema 收紧）单独会挂 build，必须与 Commit 2（frontmatter）一起推送

---

## File Structure

| 路径 | 动作 | 职责 |
|---|---|---|
| `src/content/posts/_template-knowledge-blog copy 2.mdx` | 删 | 误复制残留 |
| `src/content/_templates/` | 建 | Astro 忽略的模板目录 |
| `src/content/config.ts` | 改 | 加 CATEGORIES/SERIES enum + refine |
| `src/content/posts/*.mdx`（33 篇） | 改 frontmatter + git mv | 内容主体 |
| `src/content/posts/*/`（9 个资源目录） | git mv | 图片资源跟随 |
| `src/pages/posts/[slug].astro` | 改名为 `[...slug].astro` | 支持多级路径 |
| `scripts/lint-content.mjs` | 建 | 校验 seriesOrder 连号/slug 唯一/图片存在 |
| `.github/workflows/deploy.yml` | 改 | 加 astro check + lint 步骤 |
| `.gitignore` | 改 | 加 `dist/` |

---

## Task 1: 清理与 Schema 收紧

**Files:**
- Delete: `src/content/posts/_template-knowledge-blog copy 2.mdx`
- Create: `src/content/_templates/.gitkeep`
- Modify: `src/content/config.ts` (完全重写)

**Interfaces:**
- Produces (供 Task 2 使用):
  - `CATEGORIES` 常量：7 个字符串字面量元组
  - `SERIES` 常量：6 个字符串字面量元组
  - `posts.schema.category`：必填 `z.enum(CATEGORIES)`
  - `posts.schema.series`：可选 `z.enum(SERIES)`
  - `posts.schema` 的 refine：series 与 seriesOrder 成对约束

⚠️ **完成本任务后 `npm run build` 会失败**（现有文章的 category/series 值不匹配 enum），这是预期的。不要单独推送本次 commit。

- [ ] **Step 1: 删除模板残留文件**

```bash
git rm "src/content/posts/_template-knowledge-blog copy 2.mdx"
```

Expected: 输出 `rm 'src/content/posts/_template-knowledge-blog copy 2.mdx'`

- [ ] **Step 2: 创建 _templates 目录并 gitkeep**

```bash
mkdir -p src/content/_templates
touch src/content/_templates/.gitkeep
git add src/content/_templates/.gitkeep
```

（Astro content collection 会自动忽略下划线前缀目录，这里放模板不会被收录。当前实际上没有可挪的原模板文件 —— 仅"copy 2"残留，已删。日后手写模板放这里。）

- [ ] **Step 3: 重写 config.ts**

覆盖写入 `src/content/config.ts`：

```ts
import { defineCollection, z } from "astro:content";

const CATEGORIES = [
  "机器学习",
  "深度学习",
  "LLM 应用",
  "Agent 框架",
  "Agent 工程",
  "强化学习",
  "工具与笔记"
] as const;

const SERIES = [
  "langgraph",
  "pytorch",
  "ml-basics",
  "agent-dev",
  "skills",
  "harness"
] as const;

const posts = defineCollection({
  type: "content",
  schema: z
    .object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      audience: z.array(z.string()).default([]),
      series: z.enum(SERIES).optional(),
      seriesOrder: z.number().int().positive().optional(),
      keywords: z.array(z.string()).default([]),
      toc: z.union([z.boolean(), z.literal("inline")]).default(true),
      tags: z.array(z.string()).default([]),
      category: z.enum(CATEGORIES),
      draft: z.boolean().default(false),
      cover: z.string().optional()
    })
    .refine(
      (d) => (d.series === undefined) === (d.seriesOrder === undefined),
      { message: "series 和 seriesOrder 必须同时存在或同时缺失" }
    )
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    role: z.string().optional(),
    stack: z.array(z.string()).default([]),
    period: z.string().optional(),
    links: z
      .object({
        demo: z.string().url().optional(),
        github: z.string().url().optional(),
        writeup: z.string().url().optional()
      })
      .optional(),
    cover: z.string().optional(),
    highlights: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    category: z.string().default("作品"),
    draft: z.boolean().default(false)
  })
});

export const collections = { posts, projects };
```

`projects` collection 保持原样（当前只有 1 篇示例，不属于本次改造范围）。

- [ ] **Step 4: 验证 build 挂在预期位置**

```bash
npm run build 2>&1 | tail -30
```

Expected: 报错，且报错内容包含类似 `Invalid enum value` 或指出某篇 mdx 的 category 值不在枚举中。这证明 schema 收紧生效。

- [ ] **Step 5: Commit（本地，暂不推送）**

```bash
git add src/content/config.ts src/content/_templates/.gitkeep
git commit -m "$(cat <<'EOF'
chore: tighten content schema and clean up templates

Introduce CATEGORIES and SERIES enums in content collection schema so
category typos and free-form series values are rejected at build time.
Add refine ensuring series and seriesOrder are set together. Also drop
the stale "_template-knowledge-blog copy 2.mdx" and reserve
_templates/ (underscore prefix ignored by Astro) for future templates.

⚠️  Build will fail on existing posts until Task 2 normalizes their
frontmatter. Do not push this commit alone.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Frontmatter 规范化

**Files:**
- Modify: 全部 33 篇 `src/content/posts/*.mdx`（不含已删的 template）

**Interfaces:**
- Consumes (from Task 1):
  - `CATEGORIES` = `["机器学习", "深度学习", "LLM 应用", "Agent 框架", "Agent 工程", "强化学习", "工具与笔记"]`
  - `SERIES` = `["langgraph", "pytorch", "ml-basics", "agent-dev", "skills", "harness"]`
- Produces (供 Task 3):
  - 每篇文章 frontmatter 已含正确的 `category`（enum 值）
  - 属于 series 的文章已含 `series`（enum 值）+ `seriesOrder`（1..N 连号）

### 规范化规则总表

| 系列 | 目标 category | seriesOrder 编号来源 |
|---|---|---|
| langgraph（7 篇） | `Agent 框架` | 按现有 `langgraph-NN-` 数字 |
| pytorch（4 篇） | `深度学习` | 按现有 `pytorch-NN-` 数字 |
| ml-basics（9 篇） | `机器学习` | 按下表逐个指定 |
| agent-dev（5 篇） | `Agent 工程` | 按下表逐个指定 |
| skills（3 篇） | `Agent 工程` | 按下表逐个指定 |
| harness（3 篇） | `Agent 工程` | 按下表逐个指定 |
| misc（2 篇） | 逐个指定（见下） | 无 series |

### 共通改动规则（对每篇都适用）

1. **添加 / 修改 `category`**：改成上表中该 series 对应的 enum 值（有些老值如 "Agents 开发" 需替换成新的 "Agent 工程"）
2. **添加 / 修改 `series`**：改成 enum 值（例如 langgraph 老 `series: "LangGraph 与智能体应用"` → `series: "langgraph"`；pytorch 老 `series: "深度学习基础"` → `series: "pytorch"`）
3. **添加 `seriesOrder`**：按下表指定；如果已经有正确值就保留
4. **清理 tags**：删除与新 category 值完全同名的 tag 项（例：`tags: ["PyTorch", "深度学习", "张量"]` + `category: "深度学习"` → `tags: ["PyTorch", "张量"]`）
5. **保留其他所有字段原值**：`title` / `description` / `pubDate` / `updatedDate` / `level` / `audience` / `keywords` / `toc` / `cover` / `draft` 一律不动

### 逐文件 seriesOrder 指定

**langgraph**（seriesOrder = 文件名里的数字）：
| 文件 | seriesOrder |
|---|---|
| `langgraph-01-langgraph介绍.mdx` | 1 |
| `langgraph-02-Graph API.mdx` | 2 |
| `langgraph-03-Reducer.mdx` | 3 |
| `langgraph-04-Nodes.mdx` | 4 |
| `langgraph-05-Edges.mdx` | 5 |
| `langgraph-06-practice.mdx` | 6 |
| `langgraph-07-Send.mdx` | 7 |

**pytorch**：
| 文件 | seriesOrder |
|---|---|
| `pytorch-01-张量的创建和操作.mdx` | 1 |
| `pytorch-02-张量的索引形状操作.mdx` | 2 |
| `pytorch-03-自动微分.mdx` | 3 |
| `pytorch-04-线性回归案例.mdx` | 4 |

**ml-basics**：
| 文件 | seriesOrder |
|---|---|
| `机器学习概念介绍.mdx` | 1 |
| `机器学习的分类.mdx` | 2 |
| `机器学习建模流程.mdx` | 3 |
| `数据集与矩阵表示.mdx` | 4 |
| `独立同分布.mdx` | 5 |
| `欠拟合与过拟合.mdx` | 6 |
| `交叉熵损失.mdx` | 7 |
| `KNN算法原理.mdx` | 8 |
| `模型蒸馏.mdx` | 9 |

**agent-dev**：
| 文件 | seriesOrder |
|---|---|
| `agent开发框架.mdx` | 1 |
| `agent开发技术壁垒.mdx` | 2 |
| `主流MultiAgent架构.mdx` | 3 |
| `多Agent统一入口架构.mdx` | 4 |
| `技术路径.mdx` | 5 |

**skills**：
| 文件 | seriesOrder |
|---|---|
| `skills原理.mdx` | 1 |
| `skills理解.mdx` | 2 |
| `skills跨框架实践.mdx` | 3 |

**harness**：
| 文件 | seriesOrder |
|---|---|
| `Harness工程概念.mdx` | 1 |
| `Harness工程与Agent的差异.mdx` | 2 |
| `Harness本质与ClaudeCode实现.mdx` | 3 |

**misc**（无 series）：
| 文件 | category |
|---|---|
| `llm-app-01-深度学习基础.mdx` | `LLM 应用` |
| `RL概念.mdx` | `强化学习` |

---

### 执行步骤

**每一篇文章按下列 3 步走**：先读、按规则改、跑 build 抽验。

- [ ] **Step 1: 处理 langgraph 系列（7 篇）**

对每个文件按上表分别设 `series: "langgraph"`、正确 `seriesOrder`、`category: "Agent 框架"`。清理 tags 里可能出现的 "Agent 框架" / "Agents 开发" 同名项（保留 "LangGraph" 这类具体技术 tag）。

示例 diff（`langgraph-01-langgraph介绍.mdx`）：

```diff
 ---
 title: "LangGraph 入门：有状态智能体与工作流编排"
 description: "..."
 pubDate: 2026-04-05
 updatedDate: 2026-04-05
 level: "intermediate"
 audience: ["后端工程师", "AI 应用开发者", ...]
-series: "LangGraph 与智能体应用"
+series: "langgraph"
 seriesOrder: 1
 keywords: ["LangGraph", "LangChain", ...]
 toc: true
-tags: [...含 "Agents 开发" 或类似...]
-category: "..."
+tags: [...去掉与 category 同名的项...]
+category: "Agent 框架"
 draft: false
 ---
```

- [ ] **Step 2: 处理 pytorch 系列（4 篇）**

`series: "pytorch"`，`category: "深度学习"`，seriesOrder 按 01/02/03/04。

示例 diff（`pytorch-01-张量的创建和操作.mdx`，当前 tags 里有 "深度学习"）：

```diff
 ---
 title: "PyTorch 张量的创建与常用操作"
 ...
-series: "深度学习基础"
+series: "pytorch"
 seriesOrder: 1
 ...
-tags: ["PyTorch", "深度学习", "张量", "NumPy"]
+tags: ["PyTorch", "张量", "NumPy"]
 category: "深度学习"
 ...
 ---
```

- [ ] **Step 3: 处理 ml-basics 系列（9 篇）**

`series: "ml-basics"`，`category: "机器学习"`，seriesOrder 按上表。

对于当前 `tags: ["机器学习"]` + `category: "机器学习"` 的文章，删除 tags 里的 "机器学习"（同名去重），若之后 tags 变空数组则保留 `tags: []` 或直接删除该字段。

示例 diff（`机器学习概念介绍.mdx`）：

```diff
 ---
 title: "机器学习概念介绍"
 description: "..."
 pubDate: 2026-07-10
 updatedDate: 2026-07-10
-tags: ["机器学习"]
+tags: []
+series: "ml-basics"
+seriesOrder: 1
 category: "机器学习"
 draft: false
 ---
```

- [ ] **Step 4: 处理 agent-dev 系列（5 篇）**

`series: "agent-dev"`，`category: "Agent 工程"`，seriesOrder 按上表。

对当前有 `category: "Agents 开发"` 的文章，改成 `category: "Agent 工程"`；tags 里出现 "Agents 开发" 也删掉。

示例 diff（`agent开发框架.mdx`）：

```diff
 ---
 title: "主流 AI Agent 开发框架分类"
 ...
-tags: ["Agents 开发"]
-category: "Agents 开发"
+tags: []
+series: "agent-dev"
+seriesOrder: 1
+category: "Agent 工程"
 draft: false
 ---
```

- [ ] **Step 5: 处理 skills 系列（3 篇）**

`series: "skills"`，`category: "Agent 工程"`，seriesOrder 按上表。同 Step 4 处理旧 category "Agents 开发"。可给 tags 加 "Skill" 这类具体技术 tag。

示例 diff（`skills原理.mdx`）：

```diff
-tags: ["Agents 开发"]
-category: "Agents 开发"
+tags: ["Skill"]
+series: "skills"
+seriesOrder: 1
+category: "Agent 工程"
```

- [ ] **Step 6: 处理 harness 系列（3 篇）**

`series: "harness"`，`category: "Agent 工程"`，seriesOrder 按上表。

- [ ] **Step 7: 处理 misc（2 篇）**

- `llm-app-01-深度学习基础.mdx`：设 `category: "LLM 应用"`，**不设 series**。
- `RL概念.mdx`：设 `category: "强化学习"`，**不设 series**。

- [ ] **Step 8: 运行 build 验证**

```bash
npm run build 2>&1 | tail -20
```

Expected: build 成功，末尾输出类似 `[build] Complete!` 或 sitemap 生成信息，没有 zod 错误。

- [ ] **Step 9: 抽验 series 聚合页**

```bash
npm run preview &
PREVIEW_PID=$!
sleep 3
curl -s http://localhost:4321/series | grep -E "langgraph|pytorch|ml-basics|agent-dev|skills|harness" | head -5
kill $PREVIEW_PID 2>/dev/null
```

Expected: 输出包含 6 个 series 的引用（HTML 片段），证明 `/series` 页正确聚合。

- [ ] **Step 10: Commit**

```bash
git add src/content/posts/
git commit -m "$(cat <<'EOF'
refactor: normalize post frontmatter to new schema

Populate every post with an enum-valid category, a series + seriesOrder
pair where applicable, and strip tag values that duplicate the new
category. All 33 posts now conform to the tightened schema from the
previous commit, restoring a green build.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 物理迁移（URL 变更）

**Files:**
- git mv: 33 篇 `.mdx` → 新子目录路径（见 spec §5 完整映射表）
- git mv: 9 个资源子目录 → 新路径
- Rename: `src/pages/posts/[slug].astro` → `src/pages/posts/[...slug].astro`
- Modify: MDX 内文相对图片引用（预计 <20 处）

**Interfaces:**
- Consumes (from Task 2): frontmatter 已经规范化
- Produces (供 Task 4): 所有文件已在最终目录位置

⚠️ **本任务破坏所有旧 URL**。用户已确认接受。

- [ ] **Step 1: 列出内文相对图片引用**

```bash
grep -rn '\](\./' src/content/posts/ > /tmp/img-refs.txt
cat /tmp/img-refs.txt
```

Expected: 输出所有 `![...](./xxx.png)` 或 `![](./xxx/yyy.png)` 引用行；预计 <20 条。保存这份列表在 Step 8 修正引用时用。

- [ ] **Step 2: 创建目标目录**

```bash
mkdir -p src/content/posts/langgraph \
         src/content/posts/pytorch \
         src/content/posts/ml-basics \
         src/content/posts/agent-dev \
         src/content/posts/skills \
         src/content/posts/harness \
         src/content/posts/misc
```

- [ ] **Step 3: git mv langgraph 系列（7 篇 + 资源目录）**

```bash
git mv "src/content/posts/langgraph-01-langgraph介绍.mdx"     src/content/posts/langgraph/01-intro.mdx
git mv "src/content/posts/langgraph-02-Graph API.mdx"          src/content/posts/langgraph/02-graph-api.mdx
git mv "src/content/posts/langgraph-03-Reducer.mdx"            src/content/posts/langgraph/03-reducer.mdx
git mv "src/content/posts/langgraph-04-Nodes.mdx"              src/content/posts/langgraph/04-nodes.mdx
git mv "src/content/posts/langgraph-05-Edges.mdx"              src/content/posts/langgraph/05-edges.mdx
git mv "src/content/posts/langgraph-06-practice.mdx"           src/content/posts/langgraph/06-practice.mdx
git mv "src/content/posts/langgraph-07-Send.mdx"               src/content/posts/langgraph/07-send.mdx

# 资源目录（只搬非空的；git mv 会自动跳过空目录内已被跟踪的文件）
git mv "src/content/posts/langgraph-01-langgraph介绍"          src/content/posts/langgraph/01-intro 2>/dev/null || true
git mv "src/content/posts/langgraph-02-Graph API"              src/content/posts/langgraph/02-graph-api 2>/dev/null || true
git mv "src/content/posts/langgraph-03-Reducer"                src/content/posts/langgraph/03-reducer 2>/dev/null || true
git mv "src/content/posts/langgraph-04-Nodes"                  src/content/posts/langgraph/04-nodes 2>/dev/null || true
git mv "src/content/posts/langgraph-05-Edges"                  src/content/posts/langgraph/05-edges 2>/dev/null || true
git mv "src/content/posts/langgraph-06-practice"               src/content/posts/langgraph/06-practice 2>/dev/null || true
git mv "src/content/posts/langgraph-07-Send"                   src/content/posts/langgraph/07-send 2>/dev/null || true
```

- [ ] **Step 4: git mv pytorch 系列（4 篇）**

```bash
git mv "src/content/posts/pytorch-01-张量的创建和操作.mdx"       src/content/posts/pytorch/01-tensor-basics.mdx
git mv "src/content/posts/pytorch-02-张量的索引形状操作.mdx"     src/content/posts/pytorch/02-tensor-shape.mdx
git mv "src/content/posts/pytorch-03-自动微分.mdx"               src/content/posts/pytorch/03-autograd.mdx
git mv "src/content/posts/pytorch-04-线性回归案例.mdx"           src/content/posts/pytorch/04-linear-regression.mdx
```

- [ ] **Step 5: git mv ml-basics 系列（9 篇 + KNN 资源目录）**

```bash
git mv "src/content/posts/机器学习概念介绍.mdx"      src/content/posts/ml-basics/01-intro.mdx
git mv "src/content/posts/机器学习的分类.mdx"        src/content/posts/ml-basics/02-classification.mdx
git mv "src/content/posts/机器学习建模流程.mdx"      src/content/posts/ml-basics/03-modeling-workflow.mdx
git mv "src/content/posts/数据集与矩阵表示.mdx"      src/content/posts/ml-basics/04-dataset-matrix.mdx
git mv "src/content/posts/独立同分布.mdx"            src/content/posts/ml-basics/05-iid.mdx
git mv "src/content/posts/欠拟合与过拟合.mdx"        src/content/posts/ml-basics/06-overfitting.mdx
git mv "src/content/posts/交叉熵损失.mdx"            src/content/posts/ml-basics/07-cross-entropy.mdx
git mv "src/content/posts/KNN算法原理.mdx"           src/content/posts/ml-basics/08-knn.mdx
git mv "src/content/posts/模型蒸馏.mdx"              src/content/posts/ml-basics/09-model-distillation.mdx

git mv "src/content/posts/KNN算法原理"               src/content/posts/ml-basics/08-knn
```

- [ ] **Step 6: git mv agent-dev / skills / harness / misc**

```bash
# agent-dev
git mv "src/content/posts/agent开发框架.mdx"               src/content/posts/agent-dev/01-frameworks.mdx
git mv "src/content/posts/agent开发技术壁垒.mdx"           src/content/posts/agent-dev/02-tech-barriers.mdx
git mv "src/content/posts/主流MultiAgent架构.mdx"          src/content/posts/agent-dev/03-multi-agent-architectures.mdx
git mv "src/content/posts/多Agent统一入口架构.mdx"         src/content/posts/agent-dev/04-unified-entry.mdx
git mv "src/content/posts/技术路径.mdx"                    src/content/posts/agent-dev/05-tech-path.mdx

# skills
git mv "src/content/posts/skills原理.mdx"                  src/content/posts/skills/01-principles.mdx
git mv "src/content/posts/skills理解.mdx"                  src/content/posts/skills/02-understanding.mdx
git mv "src/content/posts/skills跨框架实践.mdx"            src/content/posts/skills/03-cross-framework.mdx

# harness
git mv "src/content/posts/Harness工程概念.mdx"             src/content/posts/harness/01-concepts.mdx
git mv "src/content/posts/Harness工程与Agent的差异.mdx"    src/content/posts/harness/02-vs-agent.mdx
git mv "src/content/posts/Harness本质与ClaudeCode实现.mdx" src/content/posts/harness/03-essence-claude-code.mdx

# misc
git mv "src/content/posts/llm-app-01-深度学习基础.mdx"     src/content/posts/misc/llm-app-deep-learning-basics.mdx
git mv "src/content/posts/RL概念.mdx"                      src/content/posts/misc/rl-concepts.mdx
git mv "src/content/posts/RL概念"                          src/content/posts/misc/rl-concepts 2>/dev/null || true
```

- [ ] **Step 7: 改 posts 路由为 rest 参数**

```bash
git mv "src/pages/posts/[slug].astro" "src/pages/posts/[...slug].astro"
```

（文件内容不需要改：`params: { slug: post.slug }` 里 `post.slug` 对子目录文章已经是 `langgraph/01-intro` 形式，Astro 会自动将 `/` 铺开到 rest 参数上。）

- [ ] **Step 8: 修正内文相对图片引用**

对 Step 1 里 `/tmp/img-refs.txt` 中的每一条引用，把旧目录名替换成新目录名。已知需要处理的：

- `src/content/posts/langgraph/01-intro.mdx` 中 `./langgraph-01-langgraph介绍/xxx.png` → `./01-intro/xxx.png`
- `src/content/posts/ml-basics/08-knn.mdx` 中 `./KNN算法原理/knn-xxx.svg` → `./08-knn/knn-xxx.svg`
- 其他 langgraph 系列内文如引用了 `./langgraph-NN-xxx/` 也照此改成 `./NN-xxx/`

再次跑 grep 确认没有残留：

```bash
grep -rn '\](\./' src/content/posts/ | grep -E '(KNN算法原理|langgraph-0[0-9]|Harness|机器学习|pytorch-0[0-9])' && echo "❌ 有残留" || echo "✓ 无残留"
```

Expected: `✓ 无残留`

- [ ] **Step 9: build 验证**

```bash
npm run build 2>&1 | tail -20
```

Expected: build 成功。

- [ ] **Step 10: preview 抽验路由**

```bash
npm run preview &
PREVIEW_PID=$!
sleep 3
# 抽查 5 个新 URL
for url in "posts/langgraph/01-intro" "posts/ml-basics/08-knn" "posts/skills/01-principles" "posts/misc/rl-concepts" "series/pytorch"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/$url")
  echo "$code $url"
done
kill $PREVIEW_PID 2>/dev/null
```

Expected: 全部 `200`。

- [ ] **Step 11: 手动验证 paste-image 在子目录里工作**

`.vscode/settings.json` 里的 `${currentFileDir}/${currentFileNameWithoutExt}` 和 `${documentBaseName}/` 都是相对当前文件，理论上无需改动。

在 VS Code/Cursor 里打开 `src/content/posts/ml-basics/08-knn.mdx`（先保存），按 Ctrl+Alt+V 或 Ctrl+V 贴一张截图。

Expected: 图片落到 `src/content/posts/ml-basics/08-knn/xxx.png`，插入 markdown 引用 `![](./08-knn/xxx.png)`。

如果没有落到正确目录，说明扩展在 rest 参数子目录下有 bug，需要把 `.vscode/settings.json` 的 `pasteImage.path` 改成显式 `${projectRoot}/src/content/posts/…` 表达式（本任务遇到再处理）。

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: reorganize posts into series subdirectories

Move 33 posts into 6 series/ subdirectories plus misc/ for standalone
notes. Rename each file to English kebab-case slugs with optional NN-
order prefix; Chinese titles stay in frontmatter. Switch posts route
from [slug].astro to [...slug].astro so multi-segment paths resolve.
Update internal image references to match new asset directory names.

Breaking: all post URLs change. Old links now 404 (per design decision
to accept the SEO/backlink cost for cleaner structure).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: CI 与 Lint 脚本

**Files:**
- Create: `scripts/lint-content.mjs`
- Modify: `.github/workflows/deploy.yml`
- Modify: `.gitignore`
- Untrack: `dist/`（当前误 tracked 的历史遗留）

**Interfaces:**
- Consumes (from Task 3): 所有文章已在最终位置，frontmatter 已规范
- Produces: CI 有硬门槛，schema/关系约束回归会自动挂

- [ ] **Step 1: 创建 scripts 目录并写 lint 脚本**

```bash
mkdir -p scripts
```

写入 `scripts/lint-content.mjs`：

```js
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
  const m = src.match(/^---\n([\s\S]*?)\n---/);
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
```

- [ ] **Step 2: 本地跑 lint 脚本**

```bash
node scripts/lint-content.mjs
```

Expected: 输出 `✓ 33 篇文章、6 个 series，无 lint 错误`。如果报错，回到 Task 2/3 修正（不要修改 lint 脚本降低标准）。

- [ ] **Step 3: 修改 GitHub Actions workflow**

修改 `.github/workflows/deploy.yml`，在 `Install dependencies` 之后、`Build Astro and Pagefind index` 之前插入 2 个新 step：

```yaml
      - name: Install dependencies
        run: npm ci

      - name: Type-check content collections
        run: npx astro check

      - name: Lint content
        run: node scripts/lint-content.mjs

      - name: Build Astro and Pagefind index
        run: npm run build
```

`astro check` 若报告 zod schema 违反，CI 会挂。`lint-content.mjs` 覆盖 zod 抓不到的关系约束。

- [ ] **Step 4: 把 dist/ 加入 .gitignore 并从索引移除**

```bash
# 追加 dist/ 到 .gitignore（先确认没有）
grep -qxF 'dist/' .gitignore || echo 'dist/' >> .gitignore

# 从 git 索引中移除已跟踪的 dist（本地文件保留）
git rm -r --cached dist/
```

Expected: `git rm --cached` 输出一堆 `rm 'dist/...'`。

- [ ] **Step 5: 本地 build 确认 dist 不再被追踪**

```bash
npm run build
git status | grep dist/ && echo "❌ dist 仍被追踪" || echo "✓ dist 已忽略"
```

Expected: `✓ dist 已忽略`。

- [ ] **Step 6: Commit**

```bash
git add scripts/lint-content.mjs .github/workflows/deploy.yml .gitignore
git add -u  # 捕获 git rm --cached 造成的删除
git commit -m "$(cat <<'EOF'
ci: add content lint and untrack dist/

Add scripts/lint-content.mjs to enforce relational constraints the zod
schema cannot catch: series seriesOrder must be a contiguous 1..N,
slugs must be globally unique, cover images and inline relative image
references must exist. Wire astro check + the lint script into the
Pages deploy workflow so schema regressions block deployment.

Also untrack dist/ (previously committed by accident); GitHub Actions
rebuilds it each run.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 发布验证清单（无 commit）

推送前的最终人工核对。若任何一项失败，回到相应 Task 修复。

- [ ] **Step 1: 推送前 dry-run build**

```bash
npm run build 2>&1 | tail -20
node scripts/lint-content.mjs
```

Expected: 两者都成功。

- [ ] **Step 2: preview 全站抽验**

```bash
npm run preview &
PREVIEW_PID=$!
sleep 3

# 首页 & 列表
for url in "" "posts" "search"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/$url")
  echo "$code /$url"
done

# 6 个 series 页
for s in langgraph pytorch ml-basics agent-dev skills harness; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/series/$s")
  echo "$code /series/$s"
done

# 抽查若干文章
for slug in "langgraph/01-intro" "pytorch/03-autograd" "ml-basics/08-knn" "skills/02-understanding" "harness/03-essence-claude-code" "misc/rl-concepts"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4321/posts/$slug")
  echo "$code /posts/$slug"
done

# RSS & sitemap
curl -s http://localhost:4321/rss.xml | grep -c '<item>'
curl -s http://localhost:4321/sitemap-0.xml | grep -c '<loc>'

kill $PREVIEW_PID 2>/dev/null
```

Expected: 所有页面 `200`；RSS `<item>` 数量 ≥ 33；sitemap `<loc>` 数量 ≥ 40。

- [ ] **Step 3: 图片显示验证（浏览器）**

在本地 preview 打开：
- `/posts/ml-basics/08-knn` → 4 张 KNN svg 显示正常
- `/posts/langgraph/01-intro` → langgraph 那张 png 显示正常

如果图片 404，说明 Step 8 有遗漏，回 Task 3 补。

- [ ] **Step 4: 推送**

```bash
git push origin main
```

推送后到 GitHub Actions 页面观察构建：`Type-check` / `Lint content` / `Build` / `Deploy` 全绿即完成。

---

## Self-Review 记录

**Spec 覆盖检查**（对照 spec 各节）：
- Spec §3 Schema：Task 1 Step 3 完整复现
- Spec §4 目录结构：Task 3 各 Step 覆盖
- Spec §5 Slug 映射：Task 3 Step 3-6 逐个 git mv
- Spec §6 Frontmatter 迁移：Task 2 分系列执行
- Spec §7 图片路径与编辑器：Task 3 Step 8/11
- Spec §8 CI + Lint：Task 4 完整覆盖
- Spec §9 分阶段 commit：Task 1-4 对应 4 个 commit
- Spec §10 风险回滚：每个 Task 都有 build 验证 step
- Spec §11 验证清单：Task 5 全量执行

**类型一致性检查**：
- Schema 里 `CATEGORIES` 7 值 = 全局约束 = frontmatter 分配表 = 一致
- Schema 里 `SERIES` 6 值 = 目录名 = frontmatter series 值 = 一致
- `[...slug].astro` 与 Astro 默认子目录 slug 行为匹配（`post.slug` 已含 `/`）
- lint 脚本的 series 分组逻辑与 zod refine 保持一致

**Placeholder 检查**：全部 step 含具体命令 / 具体代码 / 具体期望值，无 TBD。

---

## 执行方式选择

Plan complete and saved to `docs/superpowers/plans/2026-07-13-content-hierarchy-refactor.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 每个 Task 派发一个新 subagent，Task 之间我 review 再放行下一个。上下文干净、每步独立验证。

**2. Inline Execution** — 在当前 session 里连续执行，每个 Task 结束时给你 checkpoint。

Which approach?
