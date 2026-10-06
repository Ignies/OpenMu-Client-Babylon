import { describe, expect, it } from 'vitest';
import { convertBux } from '../../terrain/mapFileEncryption';
import type { GateLayout } from '../../../version/contract';
import { SEASON6_GATES, parseGates } from './gates';

/** One record laid out by `layout` from the fields, Bux-encoded like the file. */
function record(layout: GateLayout, fields: number[]): Uint8Array {
  const bytes = new Uint8Array(layout.size);
  const view = new DataView(bytes.buffer);
  bytes.set(fields.slice(0, 6));
  const put = ({ at, bytes: width }: { at: number; bytes: 1 | 2 }, value: number) =>
    width === 2 ? view.setUint16(at, value, true) : (bytes[at] = value);
  put(layout.target, fields[6]);
  put(layout.angle, fields[7]);
  put(layout.level, fields[8]);
  if (layout.maxLevel) put(layout.maxLevel, fields[9] ?? 0);
  convertBux(bytes, layout.size);
  return bytes;
}

function file(layout: GateLayout, records: number[][]): Uint8Array {
  const out = new Uint8Array(layout.records * layout.size);
  records.forEach((fields, i) => out.set(record(layout, fields), i * layout.size));
  // The empty records are zeros before the Bux pass, like the shipped files.
  for (let i = records.length; i < layout.records; i++) out.set(record(layout, [0, 0, 0, 0, 0, 0, 0, 0, 0]), i * layout.size);
  return out;
}

describe('parseGates', () => {
  it('reads the Season 6 table: 512 records of 14 bytes, WORD target and levels', () => {
    const gates = parseGates(file(SEASON6_GATES, [[0, 0, 0, 0, 0, 0, 0, 0, 0], [1, 0, 121, 232, 123, 233, 300, 0, 20, 400]]));

    expect(gates).toHaveLength(512);
    expect(gates[1]).toEqual({
      index: 1, flag: 1, map: 0, x1: 121, y1: 232, x2: 123, y2: 233, target: 300, angle: 0, level: 20, maxLevel: 400,
    });
  });

  it('reads a period table laid out byte by byte, with no max level', () => {
    const layout: GateLayout = {
      records: 100,
      size: 9,
      target: { at: 6, bytes: 1 },
      angle: { at: 7, bytes: 1 },
      level: { at: 8, bytes: 1 },
    };
    const gates = parseGates(file(layout, [[0, 0, 0, 0, 0, 0, 0, 0, 0], [1, 0, 121, 232, 123, 233, 2, 0, 20], [2, 1, 107, 247, 110, 247, 0, 1, 20]]), layout);

    expect(gates).toHaveLength(100);
    expect(gates[1]).toMatchObject({ flag: 1, map: 0, x1: 121, y1: 232, x2: 123, y2: 233, target: 2, angle: 0, level: 20, maxLevel: 0 });
    expect(gates[2]).toMatchObject({ flag: 2, map: 1, x1: 107, y1: 247, target: 0, angle: 1 });
  });

  it('refuses a file shorter than its layout', () => {
    expect(() => parseGates(new Uint8Array(900))).toThrow(/truncated/);
  });
});
