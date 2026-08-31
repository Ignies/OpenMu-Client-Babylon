import { convertBux } from '../../common/terrain/mapFileEncryption';
import { downloadDataFile } from './dataFolder';

const MAX_GATES = 512;
const GATE_RECORD_SIZE = 14;

export const GateFlag = {
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
  const buffer = await downloadDataFile('gate.bmd');
  const expected = MAX_GATES * GATE_RECORD_SIZE;

  if (buffer.length < expected) {
    throw new Error(
      `gate.bmd is truncated: expected ${expected} bytes, got ${buffer.length}`
    );
  }

  const gates: Gate[] = [];

  for (let i = 0; i < MAX_GATES; i++) {
    const record = buffer.slice(
      i * GATE_RECORD_SIZE,
      (i + 1) * GATE_RECORD_SIZE
    );

    convertBux(record, GATE_RECORD_SIZE);

    const view = new DataView(
      record.buffer,
      record.byteOffset,
      record.byteLength
    );

    gates.push({
      index: i,
      flag: record[0],
      map: record[1],
      x1: record[2],
      y1: record[3],
      x2: record[4],
      y2: record[5],
      target: view.getUint16(6, true),
      angle: record[8],
      level: view.getUint16(10, true),
      maxLevel: view.getUint16(12, true),
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
