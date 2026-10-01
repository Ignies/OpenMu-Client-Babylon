/** Lower case, accents and punctuation folded away, spaces collapsed. */
export function normaliseText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%+]+/gu, ' ')
    .trim();
}

/** Every word of the query appears somewhere in one of the texts. */
export function matchesQuery(query: string, texts: readonly string[]): boolean {
  const words = normaliseText(query).split(' ').filter(Boolean);
  if (words.length === 0) return false;

  const haystack = texts.map(normaliseText).join(' ');
  return words.every(word => haystack.includes(word));
}
