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

    expect(KEYS.length).toBe(2413);
    expect(hashes).toEqual({
      en: '112e50ded44e26ad',
      bg: '7a8a3d9d76e9ebb1',
      zh: '38b8d21e1103b6a6',
      fr: '3d0cc1f558af065d',
      de: '9eb02a4fbaaf48ae',
      it: 'fa78141a70db1a40',
      ja: '89a7ca378ae681fa',
      ko: 'e551adca99ce6046',
      pl: '8d21726e50b16004',
      pt: '323090cc203ab176',
      ro: 'ea79fe028691cf40',
      ru: 'db2fba9df8ca5403',
      es: '8498b6442127b16f',
      th: '4557c019aa13ff82',
      vi: '739ca64ce62b2a50',
    });
  });
});
