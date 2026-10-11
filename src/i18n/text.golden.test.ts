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

    expect(KEYS.length).toBe(2485);
    expect(hashes).toEqual({
      en: 'fa8a8c0d32e8f103',
      bg: '58e495b6aa629863',
      zh: '43ab26bc52ff3816',
      fr: '0b87df10a42539ff',
      de: 'e8eace2672858710',
      it: '74e74d5bb2134a18',
      ja: '084c0bd8f4e596d2',
      ko: '63d7794216441272',
      pl: '518465fe5c6faeb4',
      pt: '27050465819b0644',
      ro: '45c1ffe7a4654335',
      ru: '6b8e66569d6f2ded',
      es: '89d5c3556e4d9005',
      th: '83ad2ad4c47f3ab1',
      vi: 'bfef854c0320ae17',
    });
  });
});
