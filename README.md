# zhang-llmlab.github.io

基于 Astro + MDX + Pagefind + Giscus 的个人网站与作品集模板。
* 记录笔记
* 分享知识
* 合作交流

## 本地启动

```bash
npm install
npm run dev
```

## 启用评论（Giscus）

1. 在仓库开启 Discussions
2. 在 [giscus.app](https://giscus.app/) 获取仓库参数
3. 复制环境变量模板并填写：

```bash
cp .env.example .env
```

需要填写：

- `PUBLIC_GISCUS_REPO`
- `PUBLIC_GISCUS_REPO_ID`
- `PUBLIC_GISCUS_CATEGORY_ID`

## SEO 能力

- `sitemap.xml`：通过 `@astrojs/sitemap` 自动生成
- `rss.xml`：通过 `src/pages/rss.xml.ts` 生成文章订阅流

## 本地预览构建产物

```bash
npm run build
npm run preview
```

## 构建

```bash
npm run build
npm run preview
```

## 你需要替换的内容

- `astro.config.mjs` 的 `site`
- `.env` 中的 Giscus 参数（参考 `.env.example`）
- `src/content/posts` 和 `src/content/projects` 下的示例内容

## 部署

仓库命名为 `zhang-llmlab.github.io` 后，`main` 分支触发 GitHub Actions 自动部署到 GitHub Pages。
