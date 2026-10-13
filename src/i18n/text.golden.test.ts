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

    expect(KEYS.length).toBe(2573);
    expect(hashes).toEqual({
      en: 'a70761e7f2971493',
      bg: '4ae56594e72fa5b0',
      zh: '7151af6756890122',
      fr: '5973dc7914d45cda',
      de: '798c9f8e0afc8e98',
      it: 'eb6f8cc339127c03',
      ja: 'e9fa4343546ecb9c',
      ko: '0df991410cd82f35',
      pl: '33668bbe9d0b0b2a',
      pt: 'd34a2cafc6cd1514',
      ro: '8d77b47f11ff82e2',
      ru: 'a04ea8a632af873c',
      es: '589f1993a951a46d',
      th: 'a169ec8b3a830a9b',
      vi: '7b6be1b2af37ef0c',
    });
  });
});
