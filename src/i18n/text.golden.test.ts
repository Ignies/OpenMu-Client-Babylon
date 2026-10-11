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

    expect(KEYS.length).toBe(2457);
    expect(hashes).toEqual({
      en: 'c31f132aa861cae4',
      bg: '26ac065487dd8068',
      zh: '6fa818488274470c',
      fr: 'aa5ca992c2884ffc',
      de: 'dd588b5792bf9b0f',
      it: '93132a46785bfc10',
      ja: '7f5aca1324c5298a',
      ko: '2e638c951baf27ac',
      pl: '4f0b3df379589185',
      pt: '76f3966bdad253a1',
      ro: '3c2fa314371668b9',
      ru: 'a51ff4102f07bf74',
      es: '5e27dbbcdb694599',
      th: 'fe677445be4ba322',
      vi: 'd14d12ee9c1d3222',
    });
  });
});
