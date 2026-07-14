/**
 * Sanitize a markdown description down to plain text for card excerpts.
 * - Removes fenced/inline code, images, links (preserves anchor text)
 * - Strips block markers (>, |, #, -, *, +), bold/italic asterisks, strike
 * - Removes table separator rows (--- or |---|)
 * - Collapses whitespace
 * - Truncates to maxLen with "…" suffix
 */
export function excerpt(raw: string | undefined, maxLen = 120): string {
  if (!raw) return "";
  let s = raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[>|#\-*+]+\s*/gm, "")
    .replace(/\*\*|__|~~|\*/g, "")
    .replace(/\|/g, " ")
    .replace(/^\s*-{3,}.*$/gm, "")
    .replace(/-{3,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length > maxLen) s = s.slice(0, maxLen).trimEnd() + "…";
  return s;
}
