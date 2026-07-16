export interface SeriesMetaEntry {
  title: string;
  description?: string;
}

export const SERIES_META: Record<string, SeriesMetaEntry> = {
  langgraph: {
    title: "LangGraph 与智能体应用",
    description: "从图 / 状态 / 检查点到 Send 并行，一个完整的 Agent 工程系列。"
  },
  pytorch: {
    title: "PyTorch 深度学习基础",
    description: "从张量到自动微分再到线性回归实战。"
  },
  "ml-basics": {
    title: "机器学习基础",
    description: "概念、分类、建模流程、经典算法与训练问题。"
  },
  "agent-dev": {
    title: "Agent 开发实践",
    description: "框架选型、技术壁垒、Multi-Agent 架构。"
  },
  skills: {
    title: "Skills 协议",
    description: "Anthropic Skills 的原理、跨框架实践与理解。"
  },
  harness: {
    title: "Harness 工程",
    description: "把 LLM 变成 Agent 的运行时外壳。"
  },
  nginx: {
    title: "Nginx 入门与实践",
    description: "从 Web 服务器到反向代理、负载均衡：概念、配置与工程实践。"
  }
};

/** Convenience: get title (Chinese) or fall back to slug. */
export function seriesTitle(slug: string | undefined | null): string {
  if (!slug) return "";
  return SERIES_META[slug]?.title ?? slug;
}

/** Convenience: get description or empty string. */
export function seriesDescription(slug: string | undefined | null): string {
  if (!slug) return "";
  return SERIES_META[slug]?.description ?? "";
}
