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

    expect(KEYS.length).toBe(2526);
    expect(hashes).toEqual({
      en: '62729d9374e21d18',
      bg: 'b7eeb5bcee82be89',
      zh: 'fda150cd6bcdf255',
      fr: 'b864ebc5c5f7cfd3',
      de: '298e569ca143a4dd',
      it: '54d5aef0a2ff3f19',
      ja: 'e1c20288b1acc6d9',
      ko: '07329afe7453b0d3',
      pl: 'ee857ecc538e0acc',
      pt: '6a89d28548a27c60',
      ro: '3bb128c35b174c85',
      ru: 'fd0ffa185636357a',
      es: 'e3aa9c9d84313c33',
      th: '87f94e5daa39b84c',
      vi: '1d1af5c720faccea',
    });
  });
});
