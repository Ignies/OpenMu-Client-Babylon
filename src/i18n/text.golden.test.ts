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

    expect(KEYS.length).toBe(2422);
    expect(hashes).toEqual({
      en: '8e6a6ea8dd70cc97',
      bg: '4d7844fd20471bce',
      zh: '444bf400bf8645de',
      fr: '7d6976b934a36ec3',
      de: '3d5cd24bc74f01c2',
      it: '0d0cc68548073895',
      ja: 'af8a678012600f87',
      ko: '023d5042354629c1',
      pl: 'f8dcf9e742f87cf9',
      pt: '97a1eaf3f22b5b2f',
      ro: '390b2a3b7b2b6f43',
      ru: 'e9d5b2d171da805b',
      es: 'a2049b4cd2488d70',
      th: 'e8deb44e9314cf7c',
      vi: '85d899b48f462eab',
    });
  });
});
