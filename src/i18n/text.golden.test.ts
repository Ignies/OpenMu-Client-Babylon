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

    expect(KEYS.length).toBe(2441);
    expect(hashes).toEqual({
      en: '91ad952188f72c21',
      bg: '7c143a205760e07e',
      zh: '9c78e5eefad32824',
      fr: '988fe48fa8d85a7f',
      de: '75e59bb3f5848ad0',
      it: '4060acaa1250c65f',
      ja: '91052450cc86fc59',
      ko: '3bb7c423dd449911',
      pl: 'feb55024339e67fd',
      pt: 'ffb15dbcd12b75ee',
      ro: '30228352b4acde4a',
      ru: '9aba2c1dadd8d784',
      es: 'f55dd31b8d154dfd',
      th: '46f86771e78f8b4c',
      vi: '2049973f8b74131a',
    });
  });
});
