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

    expect(KEYS.length).toBe(2424);
    expect(hashes).toEqual({
      en: 'e59c1311acd86c29',
      bg: 'fb2b34be6b6ef0c4',
      zh: '05a5b8991baa75d1',
      fr: '3aff35d356dead05',
      de: 'e20eb7cd667919ad',
      it: '7eb07a81f06b2997',
      ja: '640ac2c6f3593a11',
      ko: '235611829d4f3f44',
      pl: '114ae6d46d4b1ac8',
      pt: '8efaccdbb54f8630',
      ro: '59cdf697e788f8f4',
      ru: '7ece2b4350a60d6e',
      es: '036384e35cbf007e',
      th: '9f0ccfbf269a7c10',
      vi: '6e5517465628b495',
    });
  });
});
