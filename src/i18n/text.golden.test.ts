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
      en: '877d72e4faa82f82',
      bg: 'ecda2f6ab6f6c49f',
      zh: '349e095aadff5d18',
      fr: '15edaef86264ac64',
      de: '5c3395b98c33a9f1',
      it: '41abc88df52a9e6b',
      ja: '714145a440339af1',
      ko: '22c166bd3cf9ecc0',
      pl: '5ded44c2714df80d',
      pt: '00d0a4459a859883',
      ro: 'f9bea5a74bebf495',
      ru: '10953d5aa65d7982',
      es: 'be36f876e152a56b',
      th: '84b707ad81e8e459',
      vi: 'de27ce2e3bfa3505',
    });
  });
});
