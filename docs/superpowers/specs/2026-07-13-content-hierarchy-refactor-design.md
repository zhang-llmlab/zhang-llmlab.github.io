# 博客文章管理层级重构 · 设计文档

- 日期：2026-07-13
- 项目：`zhang-llmlab.github.io`（Astro + MDX + Pagefind + Giscus）
- 目标：把 34 篇散落文章重组成有 series/category 治理的清晰结构

---

## 1. 背景与问题

当前 `src/content/posts/` 共 34 个 `.mdx`（含 1 个模板残留）+ 9 个资源目录，全部平铺在同一目录，存在以下问题：

- **命名不统一**：英文 kebab（`langgraph-01-*.mdx`）、含空格（`langgraph-02-Graph API.mdx` → URL `%20`）、纯中文（`机器学习概念介绍.mdx` → URL 编码）混杂
- **Frontmatter 断层**：老文章（langgraph、pytorch）完整填写 `series/level/audience/keywords`；新同步的（机器学习、skills、agent）只有 `tags + category`，未接入 `/series` 聚合
- **taxonomy 语义重叠**：`category` 与同名 `tags` 值退化成单一分类轴；`category` 无枚举约束，"未分类"、"Agents 开发" 等散养值可自由生长
- **物理组织平铺**：明显成组内容（langgraph×7、pytorch×4、skills×3、机器学习×N、agent×N）挤在一起，作者视角难扫
- **垃圾文件**：`_template-knowledge-blog copy 2.mdx` 是误复制残留
- **模板与内容混放**：模板文件散落在 posts 目录里

---

## 2. 关键决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| URL 兼容 | 干净重构，不保留旧 URL | 博客初期外链和 SEO 权重都低，兼容成本大于收益 |
| Series 粒度 | 6 个细粒度 series | 与现有内容天然分组吻合，粒度合适 |
| 分类轴模型 | 保留 series / category / tag 三轴，职责分开 | series 强顺序，category 强枚举，tag 自由多值 |
| Category 枚举 | 7 个：机器学习 / 深度学习 / LLM 应用 / Agent 框架 / Agent 工程 / 强化学习 / 工具与笔记 | 覆盖当前所有内容且有适度扩展空间 |
| 命名规则 | 英文 kebab-case + 可选编号前缀（标题保留中文写在 frontmatter） | URL 干净可分享；中文题名不损失 |
| CI 校验 | astro check + 自定义 lint 脚本 | zod 覆盖字段，lint 覆盖关系约束 |
| 执行方式 | 分阶段多 commit | 每步独立可 build 可回滚 |
| 图片文件名 | 只跟目录搬迁，不重命名文件本身 | 减少内文引用改动的出错面 |

---

## 3. 新 Schema（`src/content/config.ts`）

```ts
const CATEGORIES = [
  "机器学习", "深度学习", "LLM 应用",
  "Agent 框架", "Agent 工程",
  "强化学习", "工具与笔记"
] as const;

const SERIES = [
  "langgraph",           // LangGraph 7 篇
  "pytorch",             // PyTorch 深度学习 4 篇
  "ml-basics",           // 机器学习基础 9 篇
  "agent-dev",           // Agent 开发 5 篇
  "skills",              // Skills 3 篇
  "harness"              // Harness 工程 3 篇
] as const;

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(CATEGORIES),
    tags: z.array(z.string()).default([]),
    series: z.enum(SERIES).optional(),
    seriesOrder: z.number().int().positive().optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    audience: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    toc: z.union([z.boolean(), z.literal("inline")]).default(true),
    draft: z.boolean().default(false),
    cover: z.string().optional()
  }).refine(
    d => (d.series === undefined) === (d.seriesOrder === undefined),
    { message: "series 和 seriesOrder 必须同时存在或同时缺失" }
  )
});
```

关键变化：
- `category` 从 `.default("未分类")` 收紧为 `z.enum(...)`
- `series` 从任意 string 收紧为 `z.enum(...)`
- 增加 `.refine` 保证 series/seriesOrder 成对
- `_templates/` 目录 Astro content 自动忽略（下划线前缀规则）

---

## 4. 新目录结构

```
src/content/
├── _templates/                              ← Astro 自动忽略
│   └── knowledge-blog.mdx
├── posts/
│   ├── langgraph/                           ← series: langgraph
│   │   ├── 01-intro.mdx        + 01-intro/
│   │   ├── 02-graph-api.mdx
│   │   ├── 03-reducer.mdx
│   │   ├── 04-nodes.mdx
│   │   ├── 05-edges.mdx
│   │   ├── 06-practice.mdx
│   │   └── 07-send.mdx
│   ├── pytorch/                             ← series: pytorch
│   │   ├── 01-tensor-basics.mdx
│   │   ├── 02-tensor-shape.mdx
│   │   ├── 03-autograd.mdx
│   │   └── 04-linear-regression.mdx
│   ├── ml-basics/                           ← series: ml-basics
│   │   ├── 01-intro.mdx
│   │   ├── 02-classification.mdx
│   │   ├── 03-modeling-workflow.mdx
│   │   ├── 04-dataset-matrix.mdx
│   │   ├── 05-iid.mdx
│   │   ├── 06-overfitting.mdx
│   │   ├── 07-cross-entropy.mdx
│   │   ├── 08-knn.mdx          + 08-knn/  (4 svg)
│   │   └── 09-model-distillation.mdx
│   ├── agent-dev/                           ← series: agent-dev
│   │   ├── 01-frameworks.mdx
│   │   ├── 02-tech-barriers.mdx
│   │   ├── 03-multi-agent-architectures.mdx
│   │   ├── 04-unified-entry.mdx
│   │   └── 05-tech-path.mdx
│   ├── skills/                              ← series: skills
│   │   ├── 01-principles.mdx
│   │   ├── 02-understanding.mdx
│   │   └── 03-cross-framework.mdx
│   ├── harness/                             ← series: harness
│   │   ├── 01-concepts.mdx
│   │   ├── 02-vs-agent.mdx
│   │   └── 03-essence-claude-code.mdx
│   └── misc/                                ← 非 series
│       ├── llm-app-deep-learning-basics.mdx
│       └── rl-concepts.mdx        + rl-concepts/
├── projects/
│   └── portfolio-site.mdx                   ← 不动
└── config.ts
```

路由影响：`src/pages/posts/[slug].astro` 改为 `src/pages/posts/[...slug].astro`（Astro rest 参数匹配多级路径）。

---

## 5. Slug 映射表（旧 → 新）

### 删除
- `_template-knowledge-blog copy 2.mdx` — 误复制残留

### langgraph（7）
| 旧 | 新 |
|---|---|
| `langgraph-01-langgraph介绍.mdx` | `langgraph/01-intro.mdx` |
| `langgraph-02-Graph API.mdx` | `langgraph/02-graph-api.mdx` |
| `langgraph-03-Reducer.mdx` | `langgraph/03-reducer.mdx` |
| `langgraph-04-Nodes.mdx` | `langgraph/04-nodes.mdx` |
| `langgraph-05-Edges.mdx` | `langgraph/05-edges.mdx` |
| `langgraph-06-practice.mdx` | `langgraph/06-practice.mdx` |
| `langgraph-07-Send.mdx` | `langgraph/07-send.mdx` |

### pytorch（4）
| 旧 | 新 |
|---|---|
| `pytorch-01-张量的创建和操作.mdx` | `pytorch/01-tensor-basics.mdx` |
| `pytorch-02-张量的索引形状操作.mdx` | `pytorch/02-tensor-shape.mdx` |
| `pytorch-03-自动微分.mdx` | `pytorch/03-autograd.mdx` |
| `pytorch-04-线性回归案例.mdx` | `pytorch/04-linear-regression.mdx` |

### ml-basics（9）
| 旧 | 新 |
|---|---|
| `机器学习概念介绍.mdx` | `ml-basics/01-intro.mdx` |
| `机器学习的分类.mdx` | `ml-basics/02-classification.mdx` |
| `机器学习建模流程.mdx` | `ml-basics/03-modeling-workflow.mdx` |
| `数据集与矩阵表示.mdx` | `ml-basics/04-dataset-matrix.mdx` |
| `独立同分布.mdx` | `ml-basics/05-iid.mdx` |
| `欠拟合与过拟合.mdx` | `ml-basics/06-overfitting.mdx` |
| `交叉熵损失.mdx` | `ml-basics/07-cross-entropy.mdx` |
| `KNN算法原理.mdx` | `ml-basics/08-knn.mdx` |
| `模型蒸馏.mdx` | `ml-basics/09-model-distillation.mdx` |

### agent-dev（5）
| 旧 | 新 |
|---|---|
| `agent开发框架.mdx` | `agent-dev/01-frameworks.mdx` |
| `agent开发技术壁垒.mdx` | `agent-dev/02-tech-barriers.mdx` |
| `主流MultiAgent架构.mdx` | `agent-dev/03-multi-agent-architectures.mdx` |
| `多Agent统一入口架构.mdx` | `agent-dev/04-unified-entry.mdx` |
| `技术路径.mdx` | `agent-dev/05-tech-path.mdx` |

### skills（3）
| 旧 | 新 |
|---|---|
| `skills原理.mdx` | `skills/01-principles.mdx` |
| `skills理解.mdx` | `skills/02-understanding.mdx` |
| `skills跨框架实践.mdx` | `skills/03-cross-framework.mdx` |

### harness（3）
| 旧 | 新 |
|---|---|
| `Harness工程概念.mdx` | `harness/01-concepts.mdx` |
| `Harness工程与Agent的差异.mdx` | `harness/02-vs-agent.mdx` |
| `Harness本质与ClaudeCode实现.mdx` | `harness/03-essence-claude-code.mdx` |

### misc（2）
| 旧 | 新 |
|---|---|
| `llm-app-01-深度学习基础.mdx` | `misc/llm-app-deep-learning-basics.mdx` |
| `RL概念.mdx` | `misc/rl-concepts.mdx` |

### 资源目录跟随（9）
| 旧目录 | 新目录 |
|---|---|
| `KNN算法原理/` | `ml-basics/08-knn/` |
| `langgraph-01-langgraph介绍/` | `langgraph/01-intro/` |
| `langgraph-03-Reducer/` | `langgraph/03-reducer/`（若非空） |
| `langgraph-04-Nodes/` | `langgraph/04-nodes/`（若非空） |
| `langgraph-05-Edges/` | `langgraph/05-edges/`（若非空） |
| `langgraph-06-practice/` | `langgraph/06-practice/`（若非空） |
| `langgraph-07-Send/` | `langgraph/07-send/`（若非空） |
| `langgraph-02-Graph API/` | `langgraph/02-graph-api/`（若非空） |
| `RL概念/` | `misc/rl-concepts/` |

图片文件名本身不改，只跟目录搬。

---

## 6. Frontmatter 迁移规则

**按 series 批量套用 category**：

| series | category |
|---|---|
| langgraph | `Agent 框架` |
| pytorch | `深度学习` |
| ml-basics | `机器学习` |
| agent-dev | `Agent 工程` |
| skills | `Agent 工程` |
| harness | `Agent 工程` |

**misc 逐个**：
| 文件 | category |
|---|---|
| `misc/llm-app-deep-learning-basics.mdx` | `LLM 应用` |
| `misc/rl-concepts.mdx` | `强化学习` |

**通用规则**：
- 新增/覆盖：`category`（改成 enum 值）、`series`（改成 enum 值，如 langgraph 从"LangGraph 与智能体应用" → "langgraph"）、`seriesOrder`（按新文件名编号）
- 清理：删除与 category 完全同名的 tag
- 保留：`title` / `description` / `pubDate` / `updatedDate` / `draft` / `cover` / `level` / `audience` / `keywords` / `toc` 全部保留原值
- 缺失可选字段不回填

---

## 7. 图片路径与编辑器配置

**内文相对引用**：所有 `![...](./旧目录名/xxx.png)` 需改成新目录名。执行前用 `grep -rn '\](\./' src/content/posts/` 列出全部，逐个修改（估计 <20 处）。

**`.vscode/settings.json` paste-image 配置**：现有配置基于当前文件相对路径生成同名子目录，天然兼容新的子目录结构。执行后手动验证一次：在 `ml-basics/08-knn.mdx` 里 Ctrl+Alt+V 贴图，确认落到 `ml-basics/08-knn/`。不符预期则调整 `pasteImage.path` 表达式。

**cover 字段**：使用 `public/covers/xxx.jpg` 站点根路径，不受影响。

---

## 8. CI 与 Lint 脚本

**`.github/workflows/deploy.yml` 新增 steps**（在 `npm run build` 之前）：

```yaml
      - name: Type-check content collections
        run: npx astro check

      - name: Lint content
        run: node scripts/lint-content.mjs
```

**`scripts/lint-content.mjs`** 校验 zod 抓不到的关系性约束：

1. **series 连号且不重复**：同 series 的 `seriesOrder` 必须是 `1..N` 连续整数
2. **slug 全局唯一**：不同子目录的 slug 不得冲突
3. **cover 图存在**：frontmatter 里的 cover 路径必须真实存在
4. **内文相对图片存在**：正则匹配 `![...](./xxx/xxx.png)` 引用，文件必须存在
5. **series/seriesOrder 成对**（双保险，zod 已保证）

脚本用纯 Node 实现（gray-matter 或简单正则），非 0 退出即让 CI 挂。

---

## 9. 分阶段 Commit 计划

### Commit 1 — 清理与 schema 收紧
- 删 `_template-knowledge-blog copy 2.mdx`
- `mkdir src/content/_templates/`
- 改 `src/content/config.ts`：加常量、`z.enum`、`.refine`
- ⚠️ 此时 build 会失败（旧 category 值不在枚举里），必须与 Commit 2 一起完成后再推送

### Commit 2 — Frontmatter 规范化（原地改，不动文件名）
- 34 篇（不含已删的模板）逐个改 frontmatter
- 添加/覆盖 series、seriesOrder、category
- 清理与 category 同名的 tag
- 验证：`npm run build` 通过，`/series` 页出现 6 个系列
- 检查点：只做到这里也是完整可发布状态

### Commit 3 — 物理迁移（破坏性 URL 变更）
- `git mv` 全部 mdx 到新路径（保留 rename 历史）
- `git mv` 资源目录跟随
- 改 `src/pages/posts/[slug].astro` → `[...slug].astro`
- 修正内文相对图片引用
- 验证：本地 `npm run build && npm run preview` 走一遍全部 6 个 series 页、34 篇文章页、tags/categories/首页
- 手动测试 paste-image 在子目录里的行为

### Commit 4 — CI 与 Lint
- 加 `scripts/lint-content.mjs`
- 改 `.github/workflows/deploy.yml`
- 本地跑 lint 全绿
- 顺手：`echo dist/ >> .gitignore` + `git rm -r --cached dist/`（清理历史遗留）

**顺序不可颠倒**：Commit 3 依赖 Commit 2 已把 series 填对；Commit 4 依赖 Commit 3 的物理路径稳定。

---

## 10. 风险与回滚

| 风险 | 缓解 |
|---|---|
| Commit 3 出问题 | 每个 commit 前 `npm run build`；挂了 `git reset --soft HEAD~1` |
| paste-image 在子目录里行为变化 | Commit 3 后手动测试；不行则调 `.vscode/settings.json` |
| SEO/外链失效 | 用户已接受"干净重构"，无需处理 |
| Giscus 评论线程与 URL 绑定，改 URL 后老评论孤立 | 博客早期评论少，接受损失；如需保留可在 `PostLayout` 加 `data-mapping="specific"` 手动指定 term |
| `dist/` 被 tracked 的历史遗留 | Commit 4 顺手清 |

---

## 11. 验证清单

Commit 3 完成后，逐项人工核对：

- [ ] `npm run build` 无错误
- [ ] `npm run preview` 首页正常
- [ ] `/posts` 列表显示全部 34 篇
- [ ] 6 个 `/series/<name>` 页面正常，seriesOrder 排序正确
- [ ] 7 个 `/categories/<name>` 页面正常
- [ ] `/tags/<tag>` 抽查 3 个正常
- [ ] `/search` Pagefind 能搜到迁移后的文章
- [ ] KNN 文章图片正常显示（`ml-basics/08-knn/knn-*.svg`）
- [ ] LangGraph 01 文章图片正常显示
- [ ] RSS `/rss.xml` 正常生成
- [ ] sitemap `/sitemap-0.xml` 包含新 URL

Commit 4 完成后：
- [ ] GitHub Actions 全绿
- [ ] `dist/` 不再出现在 `git status`
