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

    expect(KEYS.length).toBe(2593);
    expect(hashes).toEqual({
      en: '75087bd183b42465',
      bg: '91907e1b9266a70b',
      zh: 'aae9a77a62935984',
      fr: 'fe24a76a1fd83513',
      de: '6abe0311e863bf26',
      it: '8119c0d93014227d',
      ja: '8abd8b95d23f0888',
      ko: 'da4d0902383d0237',
      pl: '98e19616598f3c1d',
      pt: 'ef93ac38bbd1647c',
      ro: 'aea4216ede2c3f81',
      ru: 'a35d7e99ad89d5fc',
      es: '7e45ea7fee012e55',
      th: '78988fc7ca03cdbb',
      vi: 'dd0f5bb84bf46570',
    });
  });
});
