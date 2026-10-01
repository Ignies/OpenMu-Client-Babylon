/**
 * Guild marks: an 8x8 bitmap of 4-bit palette indices, 32 bytes packed two
 * pixels per byte (high nibble first), as `GuildInformation.Logo` and
 * `GuildCreateRequest.GuildEmblem` carry it.
 *
 * `CreateGuildMark` (ZzzInventory.cpp:11204) is the palette: entry 0 is
 * transparent, the rest are the 15 fixed colours of the mark editor.
 */

export const GUILD_MARK_SIZE = 8;
export const GUILD_MARK_BYTES = 32;

/** `MarkColor[i]` as CSS. Entry 0 is the transparent one. */
export const GUILD_MARK_PALETTE: string[] = [
  'transparent',
  'rgb(0,0,0)',
  'rgb(128,128,128)',
  'rgb(255,255,255)',
  'rgb(255,0,0)',
  'rgb(255,128,0)',
  'rgb(255,255,0)',
  'rgb(128,255,0)',
  'rgb(0,255,0)',
  'rgb(0,255,128)',
  'rgb(0,255,255)',
  'rgb(0,128,255)',
  'rgb(0,0,255)',
  'rgb(128,0,255)',
  'rgb(255,0,255)',
  'rgb(255,0,128)',
];

/** Packed 32 bytes → 64 palette indices, row-major. */
export function unpackGuildMark(packed: ArrayLike<number>): number[] {
  const pixels = new Array<number>(GUILD_MARK_SIZE * GUILD_MARK_SIZE).fill(0);
  for (let i = 0; i < GUILD_MARK_BYTES && i < packed.length; i++) {
    const byte = packed[i] & 0xff;
    pixels[i * 2] = byte >> 4;
    pixels[i * 2 + 1] = byte & 0x0f;
  }
  return pixels;
}

/** 64 palette indices → the packed 32 bytes the packets want. */
export function packGuildMark(pixels: ArrayLike<number>): number[] {
  const packed = new Array<number>(GUILD_MARK_BYTES).fill(0);
  for (let i = 0; i < GUILD_MARK_BYTES; i++) {
    const hi = (pixels[i * 2] ?? 0) & 0x0f;
    const lo = (pixels[i * 2 + 1] ?? 0) & 0x0f;
    packed[i] = (hi << 4) | lo;
  }
  return packed;
}

export function isEmptyGuildMark(packed: ArrayLike<number>): boolean {
  for (let i = 0; i < packed.length; i++) if (packed[i]) return false;
  return true;
}

const dataUrlCache = new Map<string, string>();

/**
 * The mark as an SVG data URL (one `rect` per painted pixel), so it scales
 * crisply at any size. Cached by content.
 */
export function guildMarkDataUrl(packed: ArrayLike<number>): string {
  const key = Array.from(packed).join(',');
  const cached = dataUrlCache.get(key);
  if (cached) return cached;

  const pixels = unpackGuildMark(packed);
  let rects = '';
  for (let y = 0; y < GUILD_MARK_SIZE; y++) {
    for (let x = 0; x < GUILD_MARK_SIZE; x++) {
      const index = pixels[y * GUILD_MARK_SIZE + x];
      if (!index) continue;
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${GUILD_MARK_PALETTE[index]}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GUILD_MARK_SIZE} ${GUILD_MARK_SIZE}" shape-rendering="crispEdges">${rects}</svg>`;
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  dataUrlCache.set(key, url);
  return url;
}
