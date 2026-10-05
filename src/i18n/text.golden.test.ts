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

    expect(KEYS.length).toBe(2352);
    expect(hashes).toEqual({
      en: '2a18e248ef81ee31',
      bg: '4022c294d555f4a7',
      zh: 'd6badd39b8396ced',
      fr: '089f44604ad2565f',
      de: '5b52244b8456fed5',
      it: 'b7c8a7564fd47af7',
      ja: '1b5f0f06ca2269a3',
      ko: '07b6ce3f0409018c',
      pl: '28eb669c2d7562b1',
      pt: 'a8a0673edc2fc28c',
      ro: 'f0a4340148528f2d',
      ru: 'bb9456b1d3b8013d',
      es: 'a30d48d16463ec90',
      th: 'c1b28b83dd56bfa5',
      vi: 'cbb6d1a4e69d399e',
    });
  });
});
