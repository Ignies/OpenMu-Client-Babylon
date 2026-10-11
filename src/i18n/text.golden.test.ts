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

    expect(KEYS.length).toBe(2428);
    expect(hashes).toEqual({
      en: '8c17ff86b9854a5b',
      bg: '5b54e8f8d9b1c373',
      zh: 'a52cbcc85bdc33fc',
      fr: 'f262a8b06bf0db33',
      de: '6acad5e7aea4efb7',
      it: 'ef78f4ef07b96bbf',
      ja: '2f99d5c5fcd52cb3',
      ko: '556d8fba01d40806',
      pl: '60d0091af13c1a41',
      pt: 'e8fb6ef844c942b3',
      ro: 'b8e81de272ad2756',
      ru: '7c71f32c6b9a44a5',
      es: 'f2ae5cd075207806',
      th: 'f53f5f153b6a55e4',
      vi: '26391cae000799a1',
    });
  });
});
