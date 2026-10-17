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

    expect(KEYS.length).toBe(2614);
    expect(hashes).toEqual({
      en: 'bb9ffcefb87f35aa',
      bg: 'd8dbea6904124e03',
      zh: '781e2dc2b4fdddac',
      fr: 'cdcd5e3442921221',
      de: '9e11b92837a2d6de',
      it: '520812130c601df3',
      ja: '525817835dfab081',
      ko: '0ce3ed472fc54ce0',
      pl: 'c403253c566757da',
      pt: '4379466be803c7e4',
      ro: '09795c53b858c2b8',
      ru: '431241950226860c',
      es: '88eb0fabff0f4129',
      th: '46b2d62b976e6192',
      vi: '922149bc9050f490',
    });
  });
});
