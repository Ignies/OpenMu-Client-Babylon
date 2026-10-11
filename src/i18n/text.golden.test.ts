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

    expect(KEYS.length).toBe(2426);
    expect(hashes).toEqual({
      en: '70a1e57984325549',
      bg: 'fbb15bab7007114a',
      zh: 'ac86af65923c17d5',
      fr: 'e8c47730d55d5bd7',
      de: '6552dee4c5b0f12b',
      it: '9aefbfc63f9a55d7',
      ja: '795f094befb51a20',
      ko: '4979fe5e435c398e',
      pl: '2ac6965f7661e866',
      pt: '66a8578fa14ef46d',
      ro: 'ef4647933a371c2f',
      ru: 'e1ca668599a64a15',
      es: 'df28cab4a9f8cd2a',
      th: 'fabde43f0fb10afd',
      vi: 'e5651804b386c99b',
    });
  });
});
