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
      en: 'bac7cb041bb8d5c9',
      bg: 'dc258b529bda263a',
      zh: '949eaae1115bb495',
      fr: 'c73a5ac96fb69b6b',
      de: '4574af333c3ef787',
      it: 'c3f5206016a35622',
      ja: 'edd50ab39cfd8229',
      ko: 'fd01b86f2df063cd',
      pl: 'fa69e460b28c8259',
      pt: '9c51e27f62b59f28',
      ro: '70c13e9952161c2b',
      ru: '4cd64a0f39a05140',
      es: '46c66078f5eededb',
      th: '23e037a201bbdff8',
      vi: '4bf4f749e7157391',
    });
  });
});
