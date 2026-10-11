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

    expect(KEYS.length).toBe(2499);
    expect(hashes).toEqual({
      en: '80e1679fc79a8f3f',
      bg: '8c975f48c3b58eb1',
      zh: 'fb6a4720b4305072',
      fr: 'c89761abc87771c9',
      de: '9290109b56a9d009',
      it: '2cdc3ae1d5851297',
      ja: 'b6e26fc8f42d1feb',
      ko: '30d90fa8495518b0',
      pl: '45023e20e7d4fb6c',
      pt: 'a84fcb98758e3f0a',
      ro: 'c6469d3fbad25692',
      ru: '6636bbbbbc179648',
      es: '9af62465bc6ced20',
      th: 'ecb71db631f1c224',
      vi: '1c545dc166b16bcb',
    });
  });
});
