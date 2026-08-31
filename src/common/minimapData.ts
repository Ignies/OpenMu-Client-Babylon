import { convertBux } from './terrain/mapFileEncryption';

/**
 * `Data/World{n}/Minimap.bmd` — the NPC / portal markers drawn over the
 * minimap (`CNewUIMiniMap::LoadImages`). The file is `MAX_MINI_MAP_DATA`
 * (100) BUX-encoded `MINI_MAP_FILE` records, a 45-byte tail and a 4-byte
 * checksum (`GenerateCheckSum2(..., 0x2BC1)`). The struct is 4-byte aligned:
 *
 *   BYTE Kind;          // 0 = end of list, 1 = NPC, 2 = portal
 *   int  Location[2];   // tile X, tile Y
 *   int  Rotation;      // marker yaw in degrees
 *   char Name[100];     // UTF-8 tooltip
 *
 * so each record is 116 bytes. The later client reads the localised
 * `Data/Local/{lang}/Minimap/Minimap_World{n}_{lang}.bmd` instead; the copies
 * shipped with this Data folder are the pre-localisation per-world files,
 * which use the same layout.
 */

export const MAX_MINI_MAP_DATA = 100;
const RECORD_SIZE = 116;
const NAME_OFFSET = 16;
const NAME_SIZE = 100;

export const MinimapMarkerKind = {
  Npc: 1,
  Portal: 2,
} as const;

export type MinimapMarker = {
  kind: number;
  /** Tile coordinates (`Location[0]`, `Location[1]`). */
  x: number;
  y: number;
  /** Degrees; the marker sprite is rotated by this on top of the map's 45°. */
  rotation: number;
  name: string;
};

/**
 * @param encoding The English localised file is UTF-8 (`ConvertFromUtf8`), the
 * Latin packs are their own code page (`i18n.dataEncoding`), and the
 * pre-localisation per-world files in this Data folder are Shift-JIS.
 */
export function parseMinimapData(
  buffer: Uint8Array,
  encoding: string = 'utf-8'
): MinimapMarker[] {
  const decoder = new TextDecoder(encoding);
  const expected = MAX_MINI_MAP_DATA * RECORD_SIZE;

  if (buffer.length < expected) {
    throw new Error(
      `Minimap.bmd is truncated: expected at least ${expected} bytes, got ${buffer.length}`
    );
  }

  const markers: MinimapMarker[] = [];

  for (let i = 0; i < MAX_MINI_MAP_DATA; i++) {
    const record = buffer.slice(i * RECORD_SIZE, (i + 1) * RECORD_SIZE);
    convertBux(record, RECORD_SIZE);

    const kind = record[0];
    // The original stops at the first Kind == 0 entry.
    if (kind === 0) break;

    const view = new DataView(
      record.buffer,
      record.byteOffset,
      record.byteLength
    );

    let nameEnd = NAME_OFFSET;
    while (nameEnd < NAME_OFFSET + NAME_SIZE && record[nameEnd] !== 0) {
      nameEnd++;
    }

    markers.push({
      kind,
      x: view.getInt32(4, true),
      y: view.getInt32(8, true),
      rotation: view.getInt32(12, true),
      name: decoder.decode(record.subarray(NAME_OFFSET, nameEnd)).trim(),
    });
  }

  return markers;
}
