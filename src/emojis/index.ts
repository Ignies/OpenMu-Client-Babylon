/// <reference types="vite/client" />
import { buildEmojiCatalog } from '../common/chatEmojis';

// Every pack folder here, found when the client is built: adding emojis is
// dropping files in, never editing a list. Only the urls are bundled; each
// picture loads the first time it is drawn.
const files = import.meta.glob<string>('./*/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const EMOJI_CATALOG = buildEmojiCatalog(files);

if (EMOJI_CATALOG.skipped.length) {
  console.warn('[emojis] skipped (bad or duplicate name):', EMOJI_CATALOG.skipped);
}
