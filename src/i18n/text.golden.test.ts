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

    expect(KEYS.length).toBe(2608);
    expect(hashes).toEqual({
      en: '057a11f7de848181',
      bg: 'd474cc5869043bed',
      zh: '5c5d7bf2dcc553e8',
      fr: '311f53e68a7ce30a',
      de: '5850621971de633e',
      it: '5f87f1e8a9ed9a40',
      ja: 'f026772a07deb96b',
      ko: '4e1ba950dc12cffa',
      pl: '7195f0d90c7409f8',
      pt: '74a41cf94f66feda',
      ro: '6656d56a659e29aa',
      ru: '08133b6e12ee15f0',
      es: '4eb125a57e84d9d9',
      th: '1cddf2f35dd03292',
      vi: 'dd8492111e34fb41',
    });
  });
});
