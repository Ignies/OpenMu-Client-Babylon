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

    expect(KEYS.length).toBe(2526);
    expect(hashes).toEqual({
      en: '276eebd0d72b68cc',
      bg: '618161ae580a1198',
      zh: '55931818f860d050',
      fr: 'bc50ff8f97d05a46',
      de: 'b57893393d1bb464',
      it: 'ced4ffc13a8c10de',
      ja: 'b242904c0bb44428',
      ko: '36f7a038f148dfd4',
      pl: '17185c6fe9a86cd5',
      pt: '7417d0d66c4a0b49',
      ro: 'd57e8a21570c9bb7',
      ru: 'd8025f4dabc01a15',
      es: 'fa5eadc8b4523506',
      th: '3b145985b6d2c278',
      vi: '11cfe198a1b8224e',
    });
  });
});
