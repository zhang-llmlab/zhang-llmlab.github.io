import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

/** 供搜索页离线/备用：标题、摘要、专题、关键词等，不做全文分词 */
export const GET: APIRoute = async () => {
  const posts = (await getCollection("posts")).filter((p) => !p.data.draft);
  const projects = (await getCollection("projects")).filter((p) => !p.data.draft);

  const items = [
    ...posts.map((p) => {
      const parts = [
        p.data.title,
        p.data.description ?? "",
        p.data.series ?? "",
        ...(p.data.keywords ?? []),
        ...(p.data.tags ?? [])
      ];
      return {
        kind: "post" as const,
        title: p.data.title,
        description: p.data.description ?? "",
        url: `/posts/${p.slug}`,
        haystack: parts.join("\n").toLowerCase()
      };
    }),
    ...projects.map((p) => {
      const parts = [
        p.data.title,
        p.data.description ?? "",
        ...(p.data.tags ?? []),
        p.data.category ?? ""
      ];
      return {
        kind: "project" as const,
        title: p.data.title,
        description: p.data.description ?? "",
        url: `/projects/${p.slug}`,
        haystack: parts.join("\n").toLowerCase()
      };
    })
  ];

  return new Response(JSON.stringify({ items }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
};
