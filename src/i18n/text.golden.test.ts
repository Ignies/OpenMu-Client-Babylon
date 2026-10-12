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

    expect(KEYS.length).toBe(2568);
    expect(hashes).toEqual({
      en: '616741615a58787f',
      bg: '2eee3d144319cbbc',
      zh: '0eb716167a227df0',
      fr: 'f283bfabd9ddefde',
      de: 'c80e51f70bbc0011',
      it: '9764c5a3d373d7b9',
      ja: '98affb76521c3198',
      ko: 'ef1c09aa75d35590',
      pl: '9d048bc736cc92af',
      pt: '41266c46ef8db2b5',
      ro: '26cd8dd263dc993e',
      ru: '04483e355e5efd02',
      es: '8843ebfce54dd1c9',
      th: 'f99a134210ec6823',
      vi: 'c2fec72ed6ecee95',
    });
  });
});
