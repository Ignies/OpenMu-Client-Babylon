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

    expect(KEYS.length).toBe(2512);
    expect(hashes).toEqual({
      en: '017e86c2b052484b',
      bg: '5538bfd9fc6fb016',
      zh: '3a6cb4c9a3ab0100',
      fr: '421b6d0756663157',
      de: 'faeb69dad73bb310',
      it: '848993b571c043b6',
      ja: 'ff861d7f2f1a8418',
      ko: '31199ecaa83db8b1',
      pl: '5fdc2855acf9f0de',
      pt: '5d8fd883e730a6af',
      ro: '2fa111b14a614dd3',
      ru: '1bd908052188a779',
      es: '3261d819570f8331',
      th: '951362f9de8ff4a0',
      vi: 'c7db66aad3adc2eb',
    });
  });
});
