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

    expect(KEYS.length).toBe(2356);
    expect(hashes).toEqual({
      en: '5ab1a225abe832ad',
      bg: '4bed3a818ed09281',
      zh: '494a7298c1e7a3bf',
      fr: '7515f702d8f3904a',
      de: '099fc0d969222c9e',
      it: '12c8cb9374f2d4df',
      ja: '870d168a37f1c230',
      ko: '8f41c802ea4ea7fd',
      pl: '0225804d941114a5',
      pt: 'cbabf0e7e91076de',
      ro: '15b0c30316917f6a',
      ru: 'e9f7e4bbb7fc5dd6',
      es: 'e08e3c209a28ddd0',
      th: 'e5dfebcf6002fe62',
      vi: 'd4c5c242fd06ac31',
    });
  });
});
