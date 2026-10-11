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

    expect(KEYS.length).toBe(2500);
    expect(hashes).toEqual({
      en: 'a91eda504cf86b60',
      bg: 'd39cbf70b123c6bd',
      zh: 'b76de7ecad62a339',
      fr: '5660fddfe46ecd0f',
      de: 'db6f06be4bb7431b',
      it: 'c54adc0dad6c49db',
      ja: '6067dec49e5543d1',
      ko: 'c893e49172415a73',
      pl: 'b9b25a131a068beb',
      pt: 'c8caa351495dfcac',
      ro: 'a35253e363ee5b03',
      ru: '3121f003e57584cc',
      es: '9d901171a3591b47',
      th: '571374fbfbb7cc6a',
      vi: '02d535a66f70c202',
    });
  });
});
