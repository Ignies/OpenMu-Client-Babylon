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

    expect(KEYS.length).toBe(2487);
    expect(hashes).toEqual({
      en: '3c9cbd34ae891fb7',
      bg: 'c8ce3cd1892a0e23',
      zh: '37ef743cf75ddd35',
      fr: '1bdcb6e06bc9d195',
      de: 'eb1c9d342728afe8',
      it: '58d327bec32b6359',
      ja: '50e03335967fecd5',
      ko: '58bdb9c105b8753d',
      pl: 'ca8803831677768e',
      pt: 'da1f6da64cefc52e',
      ro: 'b68d3f22a34f0a5f',
      ru: '2c990ae27f1f5853',
      es: 'ddd36a5285367513',
      th: '9ced77519bfeea86',
      vi: '208db311d339e5c1',
    });
  });
});
