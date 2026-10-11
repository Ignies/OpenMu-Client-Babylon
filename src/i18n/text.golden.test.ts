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

    expect(KEYS.length).toBe(2534);
    expect(hashes).toEqual({
      en: '1e96e977ae8becf2',
      bg: 'bb800d83b4fcfa54',
      zh: '5a4ec9fafa891bbb',
      fr: '168195d0083feeeb',
      de: '0d7ccb9d892f73ce',
      it: 'b42444e4a0adf59b',
      ja: '6e61e6d1835fd2f8',
      ko: 'ca599144dcd4c5d1',
      pl: 'ae18df6ce45b77a8',
      pt: 'b9021ff1661f6d2a',
      ro: '7c0f16d0374aaa2b',
      ru: 'ac263ea5d93359ad',
      es: 'f6f003460e5742a3',
      th: 'bdf2a10ecae89118',
      vi: '12cf2f712e1c4a27',
    });
  });
});
