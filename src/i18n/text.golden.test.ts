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

    expect(KEYS.length).toBe(2350);
    expect(hashes).toEqual({
      en: '355106486ad46af4',
      bg: 'b10ae6d5d23d099c',
      zh: '0eeb23302c665742',
      fr: '3019d4d7dee9b242',
      de: '2141b83c1a3c02a2',
      it: '45802b61977db8e7',
      ja: '8650d327d475410c',
      ko: '0b7dc6980f57c1c5',
      pl: 'eef91dff69bd35ce',
      pt: 'eba632b3600b4bd2',
      ro: '8c1080e772f23266',
      ru: 'c9527cd8518c099e',
      es: 'e5ab4fb3cf8ae8a5',
      th: '65810e752428563e',
      vi: '4568226c066f04a8',
    });
  });
});
