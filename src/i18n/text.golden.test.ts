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

    expect(KEYS.length).toBe(2464);
    expect(hashes).toEqual({
      en: 'bead1e47ed377774',
      bg: '98d7c3278e507ebb',
      zh: 'd8271651ec000e6c',
      fr: '0d31c160c270eaed',
      de: '0ab8d4b7ad5c423e',
      it: '402999891977d6bb',
      ja: 'aba84c833244c675',
      ko: '222c367b0a5e4a29',
      pl: 'd0392c6a80795636',
      pt: '6cad654aeb22cdd4',
      ro: '1889e3369dcf52f0',
      ru: '7e62c97da4149d85',
      es: 'a160ac84bb08617e',
      th: '8da90594cce2cedb',
      vi: 'd97d75d860b58bff',
    });
  });
});
