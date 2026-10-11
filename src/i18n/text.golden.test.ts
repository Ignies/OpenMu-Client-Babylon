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

    expect(KEYS.length).toBe(2535);
    expect(hashes).toEqual({
      en: '57d284605e7dee3d',
      bg: 'dd0c9d9b68d707ca',
      zh: '861d2e54dfc86a27',
      fr: '22f0a850b9ad102f',
      de: '51d4bf262dbf8297',
      it: 'a327a3cb777ce55a',
      ja: 'f1e1c587760ccac2',
      ko: '82f58f40e4bb7ed8',
      pl: '6c66bb7e9d8845fd',
      pt: '4821713e2231172a',
      ro: '86f83a48c9294960',
      ru: 'e97bae44f610569c',
      es: 'b50bbe2f751e0f4a',
      th: 'c719a5a35c2e1e81',
      vi: '4064cd04af399c2b',
    });
  });
});
