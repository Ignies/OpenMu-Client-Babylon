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

    expect(KEYS.length).toBe(2492);
    expect(hashes).toEqual({
      en: 'd9faabf92f2fea29',
      bg: 'a6e2649b72005aff',
      zh: 'dbe9ff5073b4f29b',
      fr: 'b541523700a3f9ed',
      de: 'e1b92d85b094603a',
      it: 'a3d7b4c28f541b88',
      ja: '962716f16023927a',
      ko: '599fb24280ed10c6',
      pl: 'ef793f5d518b254f',
      pt: 'c2e588f41448101d',
      ro: '608398dd256e4861',
      ru: '8568b3795b782a45',
      es: '3af153c445540048',
      th: '5d0c2a18f05c376e',
      vi: '128551170e29172a',
    });
  });
});
