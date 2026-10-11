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

    expect(KEYS.length).toBe(2412);
    expect(hashes).toEqual({
      en: '5a55a0176a7b78b3',
      bg: 'c59d95511689540b',
      zh: 'e35b7e5f6fcc27f7',
      fr: '98328af7e12d34bb',
      de: '31de492f523caf56',
      it: 'e6a0853f7bad4167',
      ja: 'afaa4a490dd7cf1a',
      ko: '9b77a5628e111e60',
      pl: '7a6e6bb8290a4a7b',
      pt: '036d31b85d3d06d0',
      ro: 'c64f60442902bc2f',
      ru: 'fd53a9f9029ecd2c',
      es: '6615ad6e5ceadbe1',
      th: '8e5abd2f947f2aa8',
      vi: '1f76dae6a1e69f29',
    });
  });
});
