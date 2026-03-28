import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    audience: z.array(z.string()).default([]),
    series: z.string().optional(),
    seriesOrder: z.number().int().positive().optional(),
    keywords: z.array(z.string()).default([]),
    toc: z.boolean().default(true),
    tags: z.array(z.string()).default([]),
    category: z.string().default("未分类"),
    draft: z.boolean().default(false),
    cover: z.string().optional()
  })
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
