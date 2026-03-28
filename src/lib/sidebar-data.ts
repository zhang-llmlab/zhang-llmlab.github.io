import { getCollection } from "astro:content";

/** 侧栏：专题来自文章 series；关键词来自文章 keywords（front-matter） */
export async function getSidebarData() {
  const allPosts = (await getCollection("posts")).filter((p) => !p.data.draft);

  const seriesMap = new Map<string, number>();
  const keywordMap = new Map<string, number>();

  for (const p of allPosts) {
    const s = p.data.series?.trim();
    if (s) {
      seriesMap.set(s, (seriesMap.get(s) || 0) + 1);
    }
    for (const raw of p.data.keywords || []) {
      const k = String(raw).trim();
      if (!k) continue;
      keywordMap.set(k, (keywordMap.get(k) || 0) + 1);
    }
  }

  const series = [...seriesMap.entries()].sort((a, b) =>
    b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "zh-CN")
  );

  const keywords = [...keywordMap.entries()]
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "zh-CN")))
    .slice(0, 18);

  return { series, keywords };
}
