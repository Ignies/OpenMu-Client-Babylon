import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { decodeKtx2, instantiateTranscoder, isKtx2 } from './ktx2Pixels';

// 8x8 ETC1S with mips: top-left red, top-right green, bottom-left blue,
// bottom-right white at alpha 0.
const QUADRANTS = Uint8Array.from(
  atob(
    'q0tUWCAyMLsNChoKAAAAAAEAAAAIAAAACAAAAAAAAAAAAAAAAQAAAAQAAAABAAAAsAAAADwAAADsAAAAJAAAABABAAAAAAAA6wAAAAAAAAABAgAAAAAAAAYAAAAAAAAAAAAAAAAAAAD/AQAAAAAAAAIAAAAAAAAAAAAAAAAAAAD9AQAAAAAAAAIAAAAAAAAAAAAAAAAAAAD7AQAAAAAAAAIAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAIAOACjAQIAAwMAAAgIAAAAAAAAAAA/AAAAAAAAAAAA/////0AAPw8AAAAAAAAAAP////8fAAAAS1RYd3JpdGVyAEJhc2lzIFVuaXZlcnNhbCAyLjUwAAAKAAcAOQAAAB0AAAAxAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAABAAAAAQAAAAEAAAAAAAAAAAAAAAEAAAABAAAAAQAAAAAAAAAAAAAAAQAAAAEAAAABAAAAIMCUAAAAAEAYRoijFwFEARAAAAAEQfkVBJgQMAAAAAjCThCnATABQQAAABAASYMls4Dqrxy2vyMABAWFh0fl5+dXVVVVfX1VUFgVEBAAAAAAqKqqqgIAwUQAAAAAAADy3yeIAhABQQAAQBjmkFcKEDGAAAAgEHgeGcEIFQBMAAAAAAAAIIAAJwdTO3XdT4AJHj8L'
  ),
  c => c.charCodeAt(0)
).buffer as ArrayBuffer;

const transcoderDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../public/js/basisTranscoder/1'
);

// The transcoder takes its Node branch under vitest and reaches for the
// CommonJS globals, which an ES module test does not have.
Object.assign(globalThis, { require: createRequire(import.meta.url), __dirname: transcoderDir });
const transcoder = () =>
  instantiateTranscoder(
    readFileSync(join(transcoderDir, 'basis_transcoder.js'), 'utf8'),
    new Uint8Array(readFileSync(join(transcoderDir, 'basis_transcoder.wasm'))).buffer
  );

describe('isKtx2', () => {
  it('knows a KTX2 file by its identifier', () => {
    expect(isKtx2(QUADRANTS)).toBe(true);
  });

  it('does not take a webp or a short buffer for one', () => {
    const webp = new TextEncoder().encode('RIFF....WEBPVP8 ');
    expect(isKtx2(webp.buffer as ArrayBuffer)).toBe(false);
    expect(isKtx2(new ArrayBuffer(4))).toBe(false);
  });
});

describe('decodeKtx2', () => {
  it('returns the top mip, top row first, with its alpha', async () => {
    const { data, width, height } = decodeKtx2(QUADRANTS, await transcoder());
    expect([width, height]).toEqual([8, 8]);

    const at = (x: number, y: number) => [...data.slice((y * 8 + x) * 4, (y * 8 + x) * 4 + 4)];
    const near = (got: number[], want: number[]) =>
      got.every((v, i) => Math.abs(v - want[i]) <= 4);

    // Row order is the claim that matters: the derived maps are laid over
    // the albedo, and a flipped decode puts every normal on the wrong texel.
    expect(near(at(1, 1), [255, 0, 0, 255])).toBe(true);
    expect(near(at(6, 1), [0, 255, 0, 255])).toBe(true);
    expect(near(at(1, 6), [0, 0, 255, 255])).toBe(true);
    expect(near(at(6, 6), [255, 255, 255, 0])).toBe(true);
  });

  it('refuses bytes that are not KTX2', async () => {
    const t = await transcoder();
    expect(() => decodeKtx2(new ArrayBuffer(64), t)).toThrow();
  });
});
