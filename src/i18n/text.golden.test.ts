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

    expect(KEYS.length).toBe(2573);
    expect(hashes).toEqual({
      en: '4a01f4ef09edf5f6',
      bg: '8397d9310ca6426b',
      zh: 'f6772da4e61121c6',
      fr: 'eed8c3059c024df5',
      de: '572b61ea74049885',
      it: 'ef40d40437937c72',
      ja: 'a202b6088f26ef7d',
      ko: 'ba9425f8ba2b2521',
      pl: '95e53533e471d81d',
      pt: '1739a7d2fc8d21aa',
      ro: '75a8a35afd0d6fb5',
      ru: '6c313edcb87549ca',
      es: '2e6bb7a58ffbaed3',
      th: '844218f94e98e1e4',
      vi: 'e86b669e0713123e',
    });
  });
});
