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

    expect(KEYS.length).toBe(2380);
    expect(hashes).toEqual({
      en: 'c6b113a7996d8589',
      bg: '3a0120bdbb8d2491',
      zh: '79157ce8dca14ce6',
      fr: '2d4a9c057a761483',
      de: '05e88789d983a8de',
      it: '494a6b9753c99239',
      ja: 'b061849922d7f3c4',
      ko: '369d629b048e3c05',
      pl: '7981f3f6da3d2b3c',
      pt: '394376d65d2b0ada',
      ro: 'c5c05edf4519ebbb',
      ru: '2804f322106c48f8',
      es: '7d8fe3e08a90b340',
      th: 'ee9f994555de517d',
      vi: '24c471a5c7de0557',
    });
  });
});
