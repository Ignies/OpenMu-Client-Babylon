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

    expect(KEYS.length).toBe(2597);
    expect(hashes).toEqual({
      en: '05dbc24761107b78',
      bg: 'aa53dcebd8cae971',
      zh: '1a47ce51667778ca',
      fr: 'e1b7a8c973cdeb8d',
      de: '0e866a2730d98c93',
      it: '588aab7ecb36b3fb',
      ja: '25778dc5d4e4a6c1',
      ko: '24779e7e4ebb2fe6',
      pl: '7b8b76ca07759adf',
      pt: 'c7dae941633fd383',
      ro: '4f566a0d12d6fd99',
      ru: 'ac4b8cc55788d8f9',
      es: 'c2805b769edebafc',
      th: '9dc7e88ce7af75ad',
      vi: '48c776f044cf8b11',
    });
  });
});
