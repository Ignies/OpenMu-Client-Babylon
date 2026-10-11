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

    expect(KEYS.length).toBe(2491);
    expect(hashes).toEqual({
      en: '1f00af2d520997e0',
      bg: '51da4787a995fb7f',
      zh: 'c4226bbbfbafcd55',
      fr: '6d6d5e2ba96b9564',
      de: 'a20b2ec9a52c36c5',
      it: '4d07541d4eb842b8',
      ja: '4cfb9c3b869664d5',
      ko: 'eba08a62a6f5bff8',
      pl: '208eace0cc6e7093',
      pt: '6ec50e9cb57665df',
      ro: 'db79bab0b773b0d8',
      ru: 'af1ecd837b0a23cf',
      es: '245f4d6aa7923f05',
      th: '0d910c295dc5c599',
      vi: '1ebff21ae9ea5fc5',
    });
  });
});
