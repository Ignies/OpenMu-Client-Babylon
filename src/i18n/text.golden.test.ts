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

    expect(KEYS.length).toBe(2502);
    expect(hashes).toEqual({
      en: '5dd04e3da47042a0',
      bg: '2d65fca1fea00586',
      zh: 'f8c0e6cd7dbf49b4',
      fr: '8d1d0b99950b2784',
      de: '5d50c8ce6bedc6cf',
      it: '38d1ca2249aeef27',
      ja: 'a383e784a6acd985',
      ko: '71d424186fb21a2b',
      pl: 'c0ce8cadd4264fad',
      pt: '43b63e9040fe7194',
      ro: '0143ff187d118ede',
      ru: 'ba5a7948c2111158',
      es: '2c71ee43c89db0ba',
      th: '251fc0f51db59a91',
      vi: 'c71bdd44817dd8a6',
    });
  });
});
