import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkMath from "remark-math";

export default defineConfig({
  site: "https://zhang-llmlab.github.io",
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      [rehypeKatex, { strict: false, throwOnError: false }],
      rehypeSlug
    ],
    syntaxHighlight: "shiki",
    shikiConfig: {
      theme: "github-dark",
      wrap: true
    }
  }
});
