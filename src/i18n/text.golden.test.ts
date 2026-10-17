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

    expect(KEYS.length).toBe(2596);
    expect(hashes).toEqual({
      en: '626331f41d886f1c',
      bg: 'd1904c8099e048e2',
      zh: '21fa8feabeff1491',
      fr: '78515d75c0a83910',
      de: '127a725a004b724c',
      it: '07d298ceb5d85544',
      ja: '447d5751ece8f422',
      ko: '13a5493f33d27d60',
      pl: '484db8ff989e6261',
      pt: '056b4fafc8e7af68',
      ro: '83511ce108178de0',
      ru: '1f4fc43acfbf2f65',
      es: '1cbbc29b35189d93',
      th: '4d321a44ad35d721',
      vi: '5df20d6441661913',
    });
  });
});
