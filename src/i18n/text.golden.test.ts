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

    expect(KEYS.length).toBe(2639);
    expect(hashes).toEqual({
      en: '418ecd6f707949b4',
      bg: '695d0b653596b4d0',
      zh: '8bc0788e6fa4fdfa',
      fr: 'a93480424d1b1bc7',
      de: '147202768ae9d4fa',
      it: '0e516daa29f3810b',
      ja: '2cd3ffecd9294ab3',
      ko: '9babf7bdc011e9de',
      pl: 'ec28fe34e703d935',
      pt: '237fbb06c6051bc5',
      ro: 'd53811abbd41572c',
      ru: 'bdc729cb8d5210e1',
      es: 'c71eae88bce1506d',
      th: '5e36c5823c4c9ada',
      vi: '689dc0a4d5a3f5a9',
    });
  });
});
