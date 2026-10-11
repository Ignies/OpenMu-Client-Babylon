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

    expect(KEYS.length).toBe(2490);
    expect(hashes).toEqual({
      en: 'a81de16bb96ad504',
      bg: '32617ee594061ab4',
      zh: 'e1fb8428a9c97f80',
      fr: '037fcd66fee769bc',
      de: '9316be071ddd8d16',
      it: 'b39bfe8ff7e9bab1',
      ja: '7b007a42b6cbdc05',
      ko: '1e4d86ecabe22e5c',
      pl: '3a60cf927bafb9ca',
      pt: '793a11b39e0f83f0',
      ro: '5fbe29bbdeec6fe4',
      ru: '6c8bc2d06494a27a',
      es: 'f11c02be5aba9f3c',
      th: 'd850039c2ab560f1',
      vi: '8a7714b96fc96a1e',
    });
  });
});
