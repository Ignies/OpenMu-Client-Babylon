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

    expect(KEYS.length).toBe(2506);
    expect(hashes).toEqual({
      en: 'b4c0fe99d0f894b2',
      bg: 'bfa0e04f1f026175',
      zh: '7d94ec1ae09e6148',
      fr: '81be3d50dbd9c677',
      de: '84ed2e215a1f6730',
      it: 'e22c088e08eb0a9d',
      ja: 'b4a3fe79768a53a3',
      ko: '6df5f971d890289a',
      pl: 'b2683fcc3bf5546d',
      pt: '563b5771955f26d7',
      ro: '8161abb32d464048',
      ru: 'f4f95b84cff92300',
      es: '620d37adf0be3914',
      th: '2df552b2eb882758',
      vi: '05db30f12249550b',
    });
  });
});
