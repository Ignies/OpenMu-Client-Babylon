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

    expect(KEYS.length).toBe(2327);
    expect(hashes).toEqual({
      en: 'f0a332c9a17a8759',
      bg: 'd743997cd49c4af5',
      zh: '3acf7b893a2a419f',
      fr: '3e459700791ae85e',
      de: 'a2084a7bb0369027',
      it: '112b514c88fc8470',
      ja: '57e451035a53dcad',
      ko: '5ba1ce5305638ac1',
      pl: 'e124ffb84c833131',
      pt: 'cb9078bd2c7f1cbe',
      ro: 'a5884705e4459125',
      ru: 'a90b97609b3d3a64',
      es: 'ec1d93f7c0fd8898',
      th: '9d7d05877e7c7e14',
      vi: '75347b7b322d2744',
    });
  });
});
