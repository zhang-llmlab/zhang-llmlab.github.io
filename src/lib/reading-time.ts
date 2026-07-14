/**
 * Estimate reading time in minutes for a mixed Chinese/English body.
 * - Chinese: ~300 characters per minute
 * - English: ~250 words per minute
 * - Rounds up; minimum 1 minute
 */
export function readingTime(body: string): number {
  const cn = (body.match(/[一-鿿]/g) ?? []).length;
  const en = (body.match(/[a-zA-Z]+/g) ?? []).length;
  const minutes = Math.ceil(cn / 300 + en / 250);
  return Math.max(1, minutes);
}
