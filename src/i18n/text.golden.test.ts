import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { EN_TEXT, i18n, t, type TextKey } from './index';

/**
 * Pins what `t(key)` returns for every key in every language, switching the
 * language through the engine, plus each language's selector metadata. Moving
 * text between files must leave every hash as it is.
 */

const KEYS = (Object.keys(EN_TEXT) as TextKey[]).sort();

function languageHash(code: string): string {
  i18n.setLanguage(code);
  expect(i18n.language).toBe(code);

  const layer = i18n.current;
  const pack = layer.dataPack;
  const hash = createHash('sha256');
  hash.update(
    JSON.stringify([
      layer.name, layer.code, layer.aliases ?? [], layer.label, layer.region, layer.font ?? '',
      pack ? [pack.folder, pack.suffix, pack.encoding ?? '', !!pack.repairs, !!pack.itemNames, !!pack.dialogPages] : null,
    ])
  );
  for (const key of KEYS) hash.update(`${key}\t${t(key)}\t${i18n.translated(key)}\n`);
  return hash.digest('hex').slice(0, 16);
}

describe('text golden', () => {
  it('every key reads the same line in every language', () => {
    const was = i18n.language;
    const hashes = Object.fromEntries(i18n.languages.map(l => [l.code, languageHash(l.code)]));
    i18n.setLanguage(was);

    expect(KEYS.length).toBe(2545);
    expect(hashes).toEqual({
      en: '56525e4c363420fd',
      bg: 'aed564a01528abef',
      zh: '01fd95b7e1304bb0',
      fr: '85a3e85ed4a750dc',
      de: '95371844e00c8767',
      it: 'dbbf37618cdfc968',
      ja: 'b5fe23c3c0b6ffc7',
      ko: 'a5f2b7aeec170972',
      pl: '60458d4ddd315d0d',
      pt: '2892acd7de6b4bc4',
      ro: 'f39cba2eae88a6c1',
      ru: '5d3bc4a4421a93de',
      es: '8aafe38a965abf83',
      th: 'e067340f96ac5b0e',
      vi: '0058a1e3bbec5171',
    });
  });
});
