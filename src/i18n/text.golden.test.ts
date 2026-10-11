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

    expect(KEYS.length).toBe(2486);
    expect(hashes).toEqual({
      en: '0394fc10c282c356',
      bg: 'deb57dbd8ed14491',
      zh: '1ef29392024fa2b2',
      fr: 'c747a1ce8ec5dc94',
      de: '4d28a2799f251067',
      it: 'e57cb67bb3662bcc',
      ja: '8554adb8bac6a3cd',
      ko: '607149aabe6c6ae7',
      pl: 'ad940b9b007d0161',
      pt: '2001a58c9b9619fa',
      ro: '5356e8d117a55334',
      ru: 'edd53b4ef85c4b9b',
      es: 'c67331545b8bfadc',
      th: '79fd03b8a0798b0a',
      vi: '4b322ce0c9cc6983',
    });
  });
});
