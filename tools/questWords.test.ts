/**
 * The words writer against the client's own reader.
 *
 * `buildWordsPack` mirrors `readQuestWords` in `libs/mu/questFiles.ts`, and the
 * thing that would quietly break is the Bux handling: the 6-byte header and the
 * body are **two separate runs**, each restarting the key. One run across both
 * decodes the header fine and turns every string to noise, so the test reads
 * back through the same walk the client uses rather than trusting the writer.
 */

import { describe, expect, it } from 'vitest';
import { buildWordsPack, type WordRow } from './questWords.ts';

const BUX_KEY = [0xfc, 0xcf, 0xab];
const HEADER_SIZE = 6;

function bux(buffer: Uint8Array): void {
  for (let i = 0; i < buffer.length; i++) buffer[i] ^= BUX_KEY[i % 3];
}

/** `readQuestWords`, transcribed. */
function readBack(bytes: Uint8Array, encoding: string): Map<number, string> {
  const decoder = new TextDecoder(encoding);
  const words = new Map<number, string>();
  let offset = 0;

  while (offset + HEADER_SIZE <= bytes.length) {
    const header = bytes.slice(offset, offset + HEADER_SIZE);
    bux(header);
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    const index = view.getInt32(0, true);
    const length = view.getInt16(4, true);
    offset += HEADER_SIZE;

    if (length < 0 || offset + length > bytes.length) break;

    const body = bytes.slice(offset, offset + length);
    bux(body);
    let end = body.indexOf(0);
    if (end < 0) end = body.length;
    words.set(index, decoder.decode(body.subarray(0, end)));
    offset += length;
  }

  return words;
}

/** A row as `readEnglishWords` hands it over: bytes, terminator included. */
function row(index: number, text: string): WordRow {
  const body = new Uint8Array(text.length + 1);
  for (let i = 0; i < text.length; i++) body[i] = text.charCodeAt(i);
  return { index, body };
}

describe('quest words pack', () => {
  it('writes a translated row and reads it back at its own index', () => {
    const problems: string[] = [];
    const pack = buildWordsPack(
      [row(1, 'Welcome.'), row(298, 'Accept a quest.')],
      { 298: 'Eine Quest annehmen.' },
      'windows-1252',
      problems
    );

    expect(problems).toEqual([]);
    const back = readBack(pack, 'windows-1252');
    expect(back.get(298)).toBe('Eine Quest annehmen.');
    expect(back.size).toBe(2);
  });

  it('leaves an untranslated row exactly as it came in', () => {
    const problems: string[] = [];
    const pack = buildWordsPack([row(1, 'Welcome.')], {}, 'windows-1251', problems);

    expect(problems).toEqual([]);
    // ASCII survives every code page, which is why the pass-through is safe
    // for the 2230 rows that have no translation.
    expect(readBack(pack, 'windows-1251').get(1)).toBe('Welcome.');
  });

  it('round-trips a code page the text actually needs', () => {
    const problems: string[] = [];
    const text = 'Зона битвы';
    const pack = buildWordsPack([row(8, 'Battle zone')], { 8: text }, 'windows-1251', problems);

    expect(problems).toEqual([]);
    expect(readBack(pack, 'windows-1251').get(8)).toBe(text);
  });

  it('keeps the line breaks the window splits on', () => {
    const problems: string[] = [];
    const text = 'Willkommen in der Welt von MU.;Wir haben gewartet.';
    const pack = buildWordsPack([row(1, 'x')], { 1: text }, 'windows-1252', problems);

    expect(problems).toEqual([]);
    const back = readBack(pack, 'windows-1252').get(1);
    expect(back).toBe(text);
    expect(back?.split(';')).toHaveLength(2);
  });

  it('reports a translation the code page cannot hold instead of mangling it', () => {
    const problems: string[] = [];
    // Cyrillic has no place in windows-1252.
    buildWordsPack([row(1, 'x')], { 1: 'Подземелье' }, 'windows-1252', problems);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('1:');
  });

  it('carries an untranslated non-ASCII row across as characters, not bytes', () => {
    const problems: string[] = [];
    // 0xa2 is `¢` in windows-1252: part of the CP949 mojibake the English
    // table already carries. Passed through as a raw byte it would be invalid
    // UTF-8; transcoded it stays the character English shows.
    const damaged: WordRow = { index: 5, body: new Uint8Array([0x61, 0xa2, 0x62, 0x00]) };
    const pack = buildWordsPack([damaged], {}, 'utf-8', problems);

    expect(problems).toEqual([]);
    expect(readBack(pack, 'utf-8').get(5)).toBe('a¢b');
  });

  it('substitutes rather than throws when a damaged row will not fit the page', () => {
    const problems: string[] = [];
    const damaged: WordRow = { index: 5, body: new Uint8Array([0x61, 0xa2, 0x62, 0x00]) };
    const pack = buildWordsPack([damaged], {}, 'windows-1251', problems);

    // windows-1251 has no `¢`; the row is already mojibake, so a question mark
    // is the right outcome and not a build failure.
    expect(problems).toEqual([]);
    expect(readBack(pack, 'windows-1251').get(5)).toBe('a?b');
  });
});
