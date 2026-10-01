import { describe, expect, it } from 'vitest';
import { noteSource, type BankManifest, type DecodedBank } from './bank';

const buffer = (tag: string) => ({ tag }) as unknown as AudioBuffer;

function bank(manifest: Partial<BankManifest>, notes: number[]): DecodedBank {
  const buffers = new Map(notes.map(n => [n, buffer(`n${n}`)]));
  return {
    manifest: { instrument: 'guitar', bank: 'x', sustained: false, attack: 0, release: 0, notes: {}, ...manifest },
    buffers,
    keys: notes.slice().sort((a, b) => a - b),
  };
}

describe('noteSource', () => {
  it('pitches the nearest note of a melodic bank for one it lacks', () => {
    const b = bank({}, [60, 64]);
    expect(noteSource(b, 60)).toEqual({ buffer: buffer('n60'), rate: 1 });
    expect(noteSource(b, 62)?.rate).toBeCloseTo(2 ** (2 / 12));
    expect(noteSource(b, 63)?.buffer).toEqual(buffer('n64'));
  });

  it('plays a kit drum at its own rate and never a neighbour', () => {
    const b = bank({ percussion: true, rates: { 36: 0.94 } }, [36, 38]);
    expect(noteSource(b, 36)).toEqual({ buffer: buffer('n36'), rate: 0.94 });
    expect(noteSource(b, 38)).toEqual({ buffer: buffer('n38'), rate: 1 });
    expect(noteSource(b, 37)).toBeNull();
  });
});
