export type Suggestable = { id: string; name: string; keywords: string[] };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word, case-insensitive match that also works for Devanagari keywords. */
export function containsTerm(text: string, term: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escape(term.toLowerCase())}($|[^\\p{L}\\p{N}\\p{M}])`, "u").test(
    text.toLowerCase(),
  );
}

/** Up to 3 authorities ranked by how many of their keywords appear in the request. No AI involved. */
export function suggestAuthorities<T extends Suggestable>(text: string, authorities: T[], limit = 3): T[] {
  return authorities
    .map((a) => ({ a, score: a.keywords.filter((k) => containsTerm(text, k)).length }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.a);
}
