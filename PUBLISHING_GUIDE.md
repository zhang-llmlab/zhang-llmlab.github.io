# 发布流程说明（文章 + 代码/作品）

本文档用于说明如何在当前站点发布你的文章和项目作品，并通过 GitHub Actions 自动上线到 `https://zhang-llmlab.github.io/`。

## 0. 发布机制总览

1. 在本地编辑内容（`src/content/posts` 或 `src/content/projects`）
2. 本地预览：`npm run dev`
3. 提交并推送到 GitHub：`git add/commit/push`
4. GitHub Actions 自动构建部署
5. 线上地址自动更新

---

## 1. 发布文章（posts）

文章目录：

- `src/content/posts/`

每篇文章一个 `.mdx` 文件，例如：

- `src/content/posts/my-first-note.mdx`

建议 Frontmatter 模板：

```mdx
---
title: "文章标题"
description: "一句话描述文章内容"
pubDate: 2026-03-28
updatedDate: 2026-03-28
tags: ["Astro", "前端", "实践"]
category: "工程化"
draft: false
---

这里写正文内容（支持 MDX 语法）。
```

字段说明：

- `draft: true`：草稿，不会发布到线上
- `draft: false`：正式发布
- `tags`：会自动参与标签页聚合
- `category`：会自动参与分类页聚合

### 领域知识博客模板（推荐）

已提供可复用模板文件：

- `src/content/posts/_template-knowledge-blog.mdx`

使用方法：

1. 复制该文件并重命名，例如：
   - `src/content/posts/ml-overfitting-note.mdx`
2. 按你的领域替换标题、描述、正文和示例代码
3. 首次编写建议保留 `draft: true`
4. 检查无误后改为 `draft: false` 发布

新增字段说明（可选）：

- `level`：`beginner` / `intermediate` / `advanced`
- `audience`：目标读者数组
- `series`：专题名称（如“机器学习基础”）
- `seriesOrder`：专题内顺序（1、2、3...）
- `keywords`：检索关键词（补充 tags）
- `toc`：是否显示目录（后续可用于目录组件）
- `series` + `seriesOrder`：会自动聚合到专题页 `/series`，并在文章详情显示专题内导航

### 正文配图：复制粘贴自动落盘（编辑器）

Astro 不会改写 Markdown/MDX 里的图片路径；要让「剪贴板里的图」写完文章后还能访问，需要把文件放进 `public/`，再用以 `/` 开头的 URL 引用。本仓库已在工作区配置好 [Paste Image](https://marketplace.visualstudio.com/items?itemName=mushan.vscode-paste-image) 扩展的保存规则（见 `.vscode/settings.json`）。

1. 在 Cursor / VS Code 中安装扩展：**Paste Image**（`mushan.vscode-paste-image`，打开仓库时也可按提示安装「工作区推荐扩展」）。
2. 打开某篇博客，例如 `src/content/posts/blog_demo.mdx`。
3. 截图或复制图片后，使用命令面板 **Paste Image**（默认快捷键因环境而异，可在键盘快捷方式里搜索 `Paste Image`）。
4. 图片会自动保存到：

   `public/posts/<与当前 mdx 同名的目录>/`

   例如当前文件为 `blog_demo.mdx`，则保存为 `public/posts/blog_demo/xxxx.png`，并在正文中插入：

   `![](/posts/blog_demo/xxxx.png)`

5. **封面图**仍建议在 frontmatter 里写指向 `public` 的路径，例如：`cover: "/covers/xxx.jpg"`（文件放在 `public/covers/`）。

若粘贴后插入的路径不对：检查 `.vscode/settings.json` 是否被个人设置覆盖；或在扩展设置里确认 `pasteImage.path` / `pasteImage.insertPattern` 与仓库一致。

---

## 2. 发布项目/代码作品（projects）

项目目录：

- `src/content/projects/`

每个项目一个 `.mdx` 文件，例如：

- `src/content/projects/my-awesome-project.mdx`

建议 Frontmatter 模板：

```mdx
---
title: "项目名称"
description: "项目一句话介绍"
role: "你的角色"
stack: ["Astro", "TypeScript", "Node.js"]
period: "2026.03 - 2026.04"
links:
  demo: "https://example.com"
  github: "https://github.com/zhang-llmlab/your-repo"
  writeup: "https://zhang-llmlab.github.io/posts/your-post"
cover: "/covers/project-cover.jpg"
highlights:
  - "亮点 1"
  - "亮点 2"
tags: ["作品集", "前端"]
category: "项目实战"
draft: false
---

这里写项目说明、技术选型、难点和结果。
```

---

## 3. 本地检查（发布前）

在项目根目录执行：

```bash
npm install
npm run dev
```

确认以下页面正常：

- 首页：`/`
- 文章列表：`/posts`
- 项目列表：`/projects`
- 搜索：`/search`
- 新增文章/项目详情页可访问

可选构建检查：

```bash
npm run build
npm run preview
```

---

## 4. 提交并发布到线上

```bash
git add .
git commit -m "feat: publish new post/project"
git push
```

推送后会自动触发 GitHub Actions：

- 工作流：`Deploy to GitHub Pages`
- 成功后自动更新 `https://zhang-llmlab.github.io/`

---

## 5. 评论系统（Giscus）说明

评论使用 Giscus，依赖仓库 Discussions。

本地 `.env` 需要配置：

```env
PUBLIC_GISCUS_REPO=zhang-llmlab/zhang-llmlab.github.io
PUBLIC_GISCUS_REPO_ID=...
PUBLIC_GISCUS_CATEGORY=General
PUBLIC_GISCUS_CATEGORY_ID=...
```

注意：

- `.env` 不应提交到仓库
- 若评论不显示，检查 Discussions 是否启用、ID 是否正确

---

## 6. 常见问题

1. **改了内容，线上没更新**
   - 检查 GitHub Actions 是否成功
   - 检查是否已 `git push`

2. **文章/项目没出现在列表中**
   - 检查 `draft` 是否误设为 `true`
   - 检查 Frontmatter 字段是否拼写正确

3. **搜索搜不到新内容**
   - 搜索依赖构建时生成索引，需等待本次部署完成

4. **评论区不显示**
   - 检查 Giscus App 是否安装并授权仓库
   - 检查 `.env` 的 `REPO_ID` 和 `CATEGORY_ID`
