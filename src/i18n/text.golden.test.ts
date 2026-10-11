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

    expect(KEYS.length).toBe(2485);
    expect(hashes).toEqual({
      en: 'eb530eb140ac789e',
      bg: '67b620c773e90ec4',
      zh: '28ba03ce87ae1231',
      fr: '46ccaf8e01b03785',
      de: 'fb603963c77f4220',
      it: '16c1681195c37a7a',
      ja: '5e4983f022766a15',
      ko: 'fb7d0eaa431838af',
      pl: 'a27bbcbe6ba879a5',
      pt: 'dd59917376b5d604',
      ro: '05c7131eaf0f8bc8',
      ru: '668868856a8c58e0',
      es: '8c20413867670d60',
      th: 'eb18c0e7d083f127',
      vi: 'e23289556e0b888c',
    });
  });
});
