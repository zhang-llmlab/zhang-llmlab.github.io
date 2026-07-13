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
