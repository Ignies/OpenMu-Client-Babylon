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

    expect(KEYS.length).toBe(2508);
    expect(hashes).toEqual({
      en: 'f4140f377ff83b28',
      bg: '480a3a0d1800aa7c',
      zh: '6abaa8c44b627679',
      fr: '8886c4a6d0de5230',
      de: '68163d2dc2283567',
      it: 'df46923b557119c7',
      ja: 'f4b4d0d5ee29f3f0',
      ko: 'd3828a120700e269',
      pl: '2be365802aa1a495',
      pt: '228b70c372b37b99',
      ro: '0801a3d59312db32',
      ru: '2e8e5f1e1e11cef9',
      es: '5fd5662dd27bb556',
      th: 'b67cf5887f53f5d8',
      vi: 'a8df2c8c2e7a24fb',
    });
  });
});
