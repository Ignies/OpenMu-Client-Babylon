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

    expect(KEYS.length).toBe(2447);
    expect(hashes).toEqual({
      en: '813444b933d91ab3',
      bg: '09f1f3b60c2d4923',
      zh: '24beb4b34826fbbc',
      fr: '86aad1d2670e5780',
      de: 'ec8855265d5124ab',
      it: '66c4dfa6194edd3f',
      ja: '57f2329b14b0ff31',
      ko: 'cf4a2db9302bdeef',
      pl: 'ddc59642ff0f696e',
      pt: 'e2b551b68f1d9591',
      ro: '18768ef65dfdd77a',
      ru: '8069178d42f6109b',
      es: '9a706d13f0a562c0',
      th: '003d4de1830629e9',
      vi: 'f81a4bd11b45482d',
    });
  });
});
