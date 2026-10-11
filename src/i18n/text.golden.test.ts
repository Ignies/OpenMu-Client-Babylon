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

    expect(KEYS.length).toBe(2566);
    expect(hashes).toEqual({
      en: '051d0fa8b3c4eaa5',
      bg: '2538706af5a4488a',
      zh: '1ec155b895fba304',
      fr: '3372667686b4f92b',
      de: '0755610c833c93ed',
      it: '075132a7d91cd0f5',
      ja: 'fea9138e0c153902',
      ko: 'fabffae76ef22066',
      pl: 'c20e850185260cd7',
      pt: '9b9558c7947f2db8',
      ro: '3676491731c83043',
      ru: '758d4a83d62ef80b',
      es: 'a73934d2cd5c1dae',
      th: '380cfc1465d2f3da',
      vi: '9e4977d27b2edb9f',
    });
  });
});
