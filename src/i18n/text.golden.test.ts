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

    expect(KEYS.length).toBe(2346);
    expect(hashes).toEqual({
      en: '87c2435f8ea1d2d1',
      bg: '4bc305c02d8d2e54',
      zh: 'aea05e4242ea9649',
      fr: '793cd4983b4278e6',
      de: 'b40978057f025001',
      it: '039ae3c59e8f277d',
      ja: '91d9dba60c5fdeb1',
      ko: '6578db7752988602',
      pl: 'a8173b2398dc4bde',
      pt: 'e08f57378559ee1c',
      ro: 'd947a253b99f6c80',
      ru: 'bf59475ed840ffa4',
      es: 'c2e0167bfd43ea58',
      th: 'd0e2bb783fcafa0a',
      vi: '2793c15b4f4d8086',
    });
  });
});
