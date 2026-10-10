import { describe, expect, it } from 'vitest';
import { readWireString } from './binaryUtils';
import { ServerMessagePacket } from '@versions/shared/packets/ServerToClientPackets';

const view = (bytes: number[]) => new DataView(Uint8Array.from(bytes).buffer);
const utf8 = (text: string) => [...new TextEncoder().encode(text)];

describe('packet strings', () => {
  it('read as UTF-8, as OpenMU writes them (Encoding.UTF8) and the original reads them (ConvertFromUtf8)', () => {
    const bytes = [...utf8('Año Ñandú'), 0, 0x41];
    expect(readWireString(view(bytes), 0, bytes.length)).toBe('Año Ñandú');
  });

  it('stop at the first NUL and at the field end', () => {
    expect(readWireString(view([0x41, 0x42, 0, 0x43]), 0, 4)).toBe('AB');
    expect(readWireString(view([0x41, 0x42, 0x43]), 0, 2)).toBe('AB');
  });

  it('keep bytes that are not UTF-8 one character each', () => {
    expect(readWireString(view([0x61, 0xf1, 0x6f]), 0, 3)).toBe('año');
  });

  it('come out of the generated readers decoded (a notice)', () => {
    const p = ServerMessagePacket.createPacket(4 + 16);
    utf8('¡Ganó!').forEach((b, i) => p.buffer.setUint8(4 + i, b));
    expect(p.Message).toBe('¡Ganó!');
  });
});
