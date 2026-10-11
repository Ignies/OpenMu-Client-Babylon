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

    expect(KEYS.length).toBe(2488);
    expect(hashes).toEqual({
      en: '51fc66cc34eb5065',
      bg: '77371e54dc8ebc7f',
      zh: '6bcba2488d81f202',
      fr: '95c294c9a70b0d9f',
      de: 'f32d99b912b3bd7b',
      it: '434dc9c02b047c58',
      ja: '7bef6f89f2154aec',
      ko: '26f565c599e5aa2b',
      pl: 'a522cb6c7b3085f1',
      pt: '8b1435ff636e7840',
      ro: 'e0e56a03225d6f48',
      ru: '153829dc720d8181',
      es: '5b9f96a56b28d8ee',
      th: 'e1f2e0b923295266',
      vi: '8935aee2accbe69d',
    });
  });
});
