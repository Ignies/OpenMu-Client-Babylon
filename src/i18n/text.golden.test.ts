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

    expect(KEYS.length).toBe(2624);
    expect(hashes).toEqual({
      en: '33831c8cc6c91821',
      bg: '6c1b8d2ef98ac7c8',
      zh: '2b90b534fbf21a85',
      fr: '22d05977e4164392',
      de: 'dd5df92a53388716',
      it: '73670939a5f5ef1b',
      ja: 'cb64a571feb204ad',
      ko: '4ede129e472f4bcb',
      pl: 'de6bab3ad3bbb7ef',
      pt: 'f09f5a95eb507d5a',
      ro: 'b7553205ca20bb8c',
      ru: 'c0fd519b2ac430ee',
      es: 'e57eaa21856ddb68',
      th: 'b1e5db9ec256bd52',
      vi: '2496d7e29b1bf1fb',
    });
  });
});
