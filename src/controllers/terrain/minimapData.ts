import { convertBux } from './mapFileEncryption';

/**
 * Minimap marker files (`CNewUIMiniMap::LoadImages`): 100 BUX-encoded 116-byte `MINI_MAP_FILE`
 * records (Kind, Location[2], Rotation, Name[100]). Layout in readme.md.
 */

const MAX_MINI_MAP_DATA = 100;
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
