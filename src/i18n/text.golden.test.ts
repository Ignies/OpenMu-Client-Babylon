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

    expect(KEYS.length).toBe(2513);
    expect(hashes).toEqual({
      en: 'b3ba2c2c65475eeb',
      bg: '6843260e043c9f05',
      zh: 'eac28b1fe245664f',
      fr: '252732943b561049',
      de: 'dffc8304b6673463',
      it: 'b942a4128a42cc28',
      ja: 'b56c59680f94de8a',
      ko: 'b36e16440e6f1ff8',
      pl: '1b85e1c0124cc0db',
      pt: '2035e915ef5a1679',
      ro: 'afec0c35ba7679fb',
      ru: 'dec9e93f5ed1aca5',
      es: '9a1797598d6bfe32',
      th: 'ebefad3583c86c98',
      vi: '8e43a14b0bd5f91a',
    });
  });
});
