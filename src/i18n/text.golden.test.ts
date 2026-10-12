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

    expect(KEYS.length).toBe(2570);
    expect(hashes).toEqual({
      en: '2f4e44eaa8056dd1',
      bg: '4527ebdae4ea638e',
      zh: 'c35865f0fb411a0e',
      fr: '412f4a46680b72d7',
      de: 'ea12430c7ce16208',
      it: '4a337fea6f11646d',
      ja: 'f90f2c8566f0a6c6',
      ko: '6bca7da4e1cb40ba',
      pl: '054b35ed01fd9576',
      pt: '73ec737f7978ecf5',
      ro: 'a5889c15f19eb5da',
      ru: '118332d9ec09bb60',
      es: 'a16914c9dfe89ac3',
      th: '42acc0848a97386d',
      vi: '013aebec159a2efc',
    });
  });
});
