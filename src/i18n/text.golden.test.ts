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

    expect(KEYS.length).toBe(2352);
    expect(hashes).toEqual({
      en: '4632d6d89e9b6b7d',
      bg: '095de543d130f9a8',
      zh: 'abd1966155b2a5bd',
      fr: '20c2dbcf2578b5dc',
      de: '8fc2bb439063f707',
      it: '0f1be794f99c8dfd',
      ja: 'fc7155fb943cc1cd',
      ko: '6c444ad23e128977',
      pl: 'f0272e07d9ca0b35',
      pt: 'a699589ddefb1191',
      ro: 'a91ad7b70cae8e23',
      ru: 'f23d8118366ab9e3',
      es: 'a609305706b5e730',
      th: '3dc9fd759a9e0b6d',
      vi: 'ea4550fbb5953924',
    });
  });
});
