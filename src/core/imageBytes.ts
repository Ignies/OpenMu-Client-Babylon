/**
 * Ours: what image an OZJ / OZT payload holds. The original files carry a JPEG (OZJ, after 24 bytes)
 * or a TGA (OZT, after 4); their lighter copies hold a WebP behind the same header
 * (`tools/liteAssets.ts`), so readers ask here instead of assuming.
 */

/** `RIFF....WEBP` at the start. */
export function isWebp(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  );
}

/** The MIME type for a Blob of an OZJ payload: WebP when rewritten, JPEG otherwise. */
export function imageMimeOf(bytes: Uint8Array): 'image/webp' | 'image/jpeg' {
  return isWebp(bytes) ? 'image/webp' : 'image/jpeg';
}

/** Width and height from the first chunk (VP8X, VP8L or VP8), or null. */
export function webpSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (!isWebp(bytes) || bytes.length < 30) return null;
  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  const at = 20;
  if (chunk === 'VP8X') {
    const width = 1 + (bytes[at + 4] | (bytes[at + 5] << 8) | (bytes[at + 6] << 16));
    const height = 1 + (bytes[at + 7] | (bytes[at + 8] << 8) | (bytes[at + 9] << 16));
    return { width, height };
  }
  if (chunk === 'VP8L') {
    const b = bytes;
    const width = 1 + (((b[at + 2] & 0x3f) << 8) | b[at + 1]);
    const height = 1 + (((b[at + 4] & 0x0f) << 10) | (b[at + 3] << 2) | ((b[at + 2] & 0xc0) >> 6));
    return { width, height };
  }
  if (chunk === 'VP8 ') {
    const width = (bytes[at + 6] | (bytes[at + 7] << 8)) & 0x3fff;
    const height = (bytes[at + 8] | (bytes[at + 9] << 8)) & 0x3fff;
    return { width, height };
  }
  return null;
}
