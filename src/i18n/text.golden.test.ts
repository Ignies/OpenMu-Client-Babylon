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

    expect(KEYS.length).toBe(2532);
    expect(hashes).toEqual({
      en: '4ac54e0d8f852252',
      bg: 'c47b5320aaef6942',
      zh: '24ae243edb16e2a3',
      fr: '76eac3993cc19acc',
      de: '14bc645c71d098b6',
      it: '497db728d80c2de9',
      ja: '680abdfde196c6a5',
      ko: 'd5acf5444a6ff360',
      pl: 'a8dccfb69d0ea081',
      pt: '70b6522c5d931a3b',
      ro: 'eb130d0152a7f7ea',
      ru: 'a956c8300b719273',
      es: '83d6f4d7adf90b8f',
      th: 'cb8cdb989905d38c',
      vi: '7a88d051f58b422e',
    });
  });
});
