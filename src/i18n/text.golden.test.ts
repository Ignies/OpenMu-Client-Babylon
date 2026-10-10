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

    expect(KEYS.length).toBe(2430);
    expect(hashes).toEqual({
      en: 'c212ea2012e533fa',
      bg: '8ace83be30f867c0',
      zh: '190a117c8a0dbeaf',
      fr: '93042f824313bea9',
      de: '464480458863a36c',
      it: '2a4ec9f398ee8ef5',
      ja: 'a78f475a902ab37f',
      ko: 'ccc7f0f9e298dcab',
      pl: '0e9752267d029d9f',
      pt: '7535731abd63798c',
      ro: '900ffb816bb767c6',
      ru: '8882fb3787600090',
      es: 'b3871994962aeb13',
      th: '82cb68ac99a4f0ad',
      vi: '539e90e2e5c54d42',
    });
  });
});
