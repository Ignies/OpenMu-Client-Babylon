import { convertBux } from '../../terrain/mapFileEncryption';
import { gameVersion } from '@/version';
import type { GateField, GateLayout } from '@/version/contract';
import { downloadDataFile } from './dataFolder';

/**
 * Season 6's `GATE_ATTRIBUTE` (_struct.h:121-134, read by `OpenGateScript`,
 * ZzzInfomation.cpp:153): `MAX_GATES` 512 records of 14 bytes, WORD `Target`
 * at 6, BYTE `Angle` at 8, WORD `Level` at 10 and `m_wMaxLevel` at 12. A
 * version whose tree lays it out otherwise names its own (`data.gates`).
 */
export const SEASON6_GATES: GateLayout = {
  records: 512,
  size: 14,
  target: { at: 6, bytes: 2 },
  angle: { at: 8, bytes: 1 },
  level: { at: 10, bytes: 2 },
  maxLevel: { at: 12, bytes: 2 },
};

const GateFlag = {
  Entrance: 1,
  Exit: 2,
} as const;

export type Gate = {
  index: number;
  flag: number;
  map: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  target: number;
  angle: number;
  level: number;
  maxLevel: number;
};

let pending: Promise<Gate[]> | null = null;

export function loadGates(): Promise<Gate[]> {
  if (!pending) {
    pending = readGates().catch(err => {
      pending = null;
      throw err;
    });
  }

  return pending;
}

async function readGates(): Promise<Gate[]> {
  return parseGates(await downloadDataFile('gate.bmd'), gameVersion.data.gates);
}

/** Every record of a `gate.bmd`, decoded with `layout`. */
export function parseGates(buffer: Uint8Array, layout: GateLayout = SEASON6_GATES): Gate[] {
  const expected = layout.records * layout.size;

  if (buffer.length < expected) {
    throw new Error(
      `gate.bmd is truncated: expected ${expected} bytes, got ${buffer.length}`
    );
  }

  const gates: Gate[] = [];

  for (let i = 0; i < layout.records; i++) {
    const record = buffer.slice(i * layout.size, (i + 1) * layout.size);

    convertBux(record, layout.size);

    const view = new DataView(
      record.buffer,
      record.byteOffset,
      record.byteLength
    );
    const read = (field: GateField | undefined) =>
      !field ? 0 : field.bytes === 2 ? view.getUint16(field.at, true) : record[field.at];

    gates.push({
      index: i,
      flag: record[0],
      map: record[1],
      x1: record[2],
      y1: record[3],
      x2: record[4],
      y2: record[5],
      target: read(layout.target),
      angle: read(layout.angle),
      level: read(layout.level),
      maxLevel: read(layout.maxLevel),
    });
  }

  return gates;
}

export function findEntranceGateAt(
  gates: readonly Gate[],
  map: number,
  x: number,
  y: number
): Gate | undefined {
  return gates.find(
    gate =>
      gate.flag === GateFlag.Entrance &&
      gate.map === map &&
      x >= gate.x1 &&
      x <= gate.x2 &&
      y >= gate.y1 &&
      y <= gate.y2
  );
}
