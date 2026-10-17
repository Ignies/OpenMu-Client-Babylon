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

    expect(KEYS.length).toBe(2616);
    expect(hashes).toEqual({
      en: '64a5ec4b4b257abe',
      bg: '85d446e1ac75f907',
      zh: 'e05e1afb456f7483',
      fr: '337439a6f4e62d9c',
      de: 'b5b01fc1fb5c23e1',
      it: '3454bfa8b3f20143',
      ja: 'aec08602ddfe225b',
      ko: 'cb11626e1a95c005',
      pl: 'fb79a14bdbebd93e',
      pt: 'a2acb380396d89af',
      ro: 'e694e840476e4a28',
      ru: 'aea805e3cae03e05',
      es: 'd2c785741be608ed',
      th: 'e79ac76d39b851fe',
      vi: 'aca1193855155e58',
    });
  });
});
