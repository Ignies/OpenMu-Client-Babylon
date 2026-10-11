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

    expect(KEYS.length).toBe(2415);
    expect(hashes).toEqual({
      en: '2806c313b1d6e39a',
      bg: 'f1da4934089979cc',
      zh: '923f1a1099dd95b9',
      fr: 'bfd980bd70ce813a',
      de: '730d87ceb2473b6e',
      it: '39f19ece5ad0d037',
      ja: '6f69e75cfc1a711d',
      ko: 'f47ad0684eeae61c',
      pl: 'b4b5ad05cd2f9eee',
      pt: '161b7316320a29a3',
      ro: 'a2e7220ba990bb43',
      ru: '343570d0568089e1',
      es: 'f7acc941135a4614',
      th: 'c1f69d98eefdeb47',
      vi: 'cb3a6f371aeecae5',
    });
  });
});
