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

    expect(KEYS.length).toBe(2406);
    expect(hashes).toEqual({
      en: '3f069062ec585755',
      bg: '594c072776cdc019',
      zh: '0fe8b0801bbaaef3',
      fr: 'd05bba3946d9a1ce',
      de: '75c6a021756f88ed',
      it: '2a1d49938808289b',
      ja: 'b6c4bc4633a7aea5',
      ko: '0b9e49fa08a24f27',
      pl: 'edb92f5602e3fd53',
      pt: '4b9e36a793b4e966',
      ro: '1358936533fb069b',
      ru: '4e0985190e595f0a',
      es: '3fd04045ce384b19',
      th: '8f623c61aca642f0',
      vi: '8e17b59957afc909',
    });
  });
});
