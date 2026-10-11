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

    expect(KEYS.length).toBe(2492);
    expect(hashes).toEqual({
      en: '7bc92cf2ab004aad',
      bg: 'f8b32cb13813564b',
      zh: '76a9028218578ff1',
      fr: 'cb705e1f4505e593',
      de: '0e512e6704bcc317',
      it: '4cb4a39c2aa241c3',
      ja: 'f6fef52decd5f993',
      ko: '397646f25c3716cd',
      pl: '3f0592f9ce14ca88',
      pt: '9c6dcff61993cc1d',
      ro: 'a4d18fe51f0cfd60',
      ru: '1b35936d92ac4c22',
      es: '411dcbccf6f83073',
      th: 'dc45d6c403d3a1ba',
      vi: 'c0151419d43f3d44',
    });
  });
});
