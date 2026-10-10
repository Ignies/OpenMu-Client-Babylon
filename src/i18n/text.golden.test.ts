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

    expect(KEYS.length).toBe(2410);
    expect(hashes).toEqual({
      en: 'cce2a3edac4c4fdf',
      bg: 'd0a89cf3e753341a',
      zh: '84f251034f558f87',
      fr: 'b2f181c2ce148a79',
      de: 'ac0cfbc1256b2fcb',
      it: 'cdd89ab5f08e90b6',
      ja: '33959f0bf459fb26',
      ko: '4641727b5bb36f98',
      pl: 'e60e0e8153d80057',
      pt: '27380191568bbbef',
      ro: 'aea5e018eb067be8',
      ru: 'c7a7833677744a74',
      es: '9e99d78f2c3f5f0e',
      th: '29c0ac770d26cae0',
      vi: '5a06c2ad29a063ac',
    });
  });
});
