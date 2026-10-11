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

    expect(KEYS.length).toBe(2436);
    expect(hashes).toEqual({
      en: '0109d7b087930721',
      bg: '096e963997992662',
      zh: '67abcda71696887c',
      fr: '7f36eaf3f855ba34',
      de: 'd43b46b5ef2acf6d',
      it: 'fb7c83caf12b7221',
      ja: '05624e6703b5ee57',
      ko: '535c8f56f5e26b99',
      pl: '1d778d23ce5c0415',
      pt: 'f0b5d8d0b7f1e383',
      ro: 'f6692eb415d7cadf',
      ru: '5c9be46a98fb3131',
      es: '981bf3cb70acada4',
      th: '5dbe83c3abef2a78',
      vi: '2c938e07b986ab37',
    });
  });
});
