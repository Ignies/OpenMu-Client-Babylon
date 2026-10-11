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

    expect(KEYS.length).toBe(2552);
    expect(hashes).toEqual({
      en: 'fdd124f9362874fb',
      bg: '6716c5ce8ce70211',
      zh: '9cb6c8daf2ddef62',
      fr: 'bc890ade1c1fff88',
      de: '341efbcff6d9a4e6',
      it: '0a9a0981404a92ba',
      ja: '2988884e51b2922f',
      ko: '9ab4b20079693a9c',
      pl: '33362475abe2d699',
      pt: '21ef7b87b643428b',
      ro: 'ade685f77c29c4a9',
      ru: '587276aca0c7b904',
      es: 'c305739c4dde0dd8',
      th: 'd59ce8c697f6d43f',
      vi: '18229cc1a1fd9ab3',
    });
  });
});
