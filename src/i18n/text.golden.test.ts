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

    expect(KEYS.length).toBe(2522);
    expect(hashes).toEqual({
      en: '08cd11d690de361c',
      bg: 'db69a8d87153ac6d',
      zh: '5c6f94d6523736ce',
      fr: 'd55c8870f83d3170',
      de: '006f85ad9d55957d',
      it: 'c1bdf2ce656d4682',
      ja: '71b1423ad77a03cf',
      ko: 'bf9e8c22db0a4072',
      pl: '47c96fdd111b2f9b',
      pt: '816e02aa23008eda',
      ro: 'a872254b62288266',
      ru: '635947dac48ae169',
      es: '7c17fb4f91732773',
      th: 'b57d7131997726c9',
      vi: '79b47df9ea6126f7',
    });
  });
});
