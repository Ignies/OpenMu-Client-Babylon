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

    expect(KEYS.length).toBe(2568);
    expect(hashes).toEqual({
      en: '788f67762c4fb39e',
      bg: 'af2ed2de22692ddc',
      zh: 'b89bf5dc7caf6f8b',
      fr: '49b2e61cf051d4e2',
      de: '997c0d8a1204c684',
      it: '66c65a5fe9c7146d',
      ja: '238b6a3e0ccf948e',
      ko: 'b0c3dadf5e8b256f',
      pl: '4d7e516d4e382841',
      pt: '276c7ef00bf7f502',
      ro: 'fcee711a824053e2',
      ru: 'a8cb43f01d00598b',
      es: 'c279fe95b75510df',
      th: 'c933dde1d301d65c',
      vi: '1ee147c96cdebba0',
    });
  });
});
