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

    expect(KEYS.length).toBe(2486);
    expect(hashes).toEqual({
      en: '26178244261c8a3f',
      bg: '7ffc0030d9e39e33',
      zh: '7611308c5b1248c3',
      fr: '0a12310e878ed59f',
      de: 'af848f0220dee9e1',
      it: '23b7a7ca8f8bd66d',
      ja: '1d168b8900dd1500',
      ko: 'f3bad5e52e0c0f1c',
      pl: '9257956c82348ab2',
      pt: '008a0f7133c0f604',
      ro: 'ea53692b3ad2ba8d',
      ru: 'd13a62dd260eb2b7',
      es: '051980abd43c1410',
      th: 'f944bf108fe83b08',
      vi: '7eb539d7f5ca4cd5',
    });
  });
});
