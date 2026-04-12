/** Match Python `len(text.split())` for word counts (whitespace-separated, empty → 0). */
export function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}
