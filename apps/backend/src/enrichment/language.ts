/**
 * Language normalization per DATA_CONTRACT.md §3 / ADR-006:
 * repository language metadata, NOT the exact language changed by an event.
 * Missing/unknown metadata must never be fabricated.
 */
export function normalizeLanguage(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/** Known-language check for filtering; unknown-but-present values pass through normalized. */
export function isKnownLanguage(normalized: string | null): boolean {
  return normalized !== null && KNOWN_LANGUAGES.has(normalized);
}

export const KNOWN_LANGUAGES: ReadonlySet<string> = new Set([
  'python', 'javascript', 'typescript', 'java', 'c', 'c++', 'c#', 'go',
  'rust', 'ruby', 'php', 'kotlin', 'swift', 'scala', 'dart', 'elixir',
  'haskell', 'lua', 'perl', 'r', 'shell', 'html', 'css', 'vue', 'svelte'
]);
