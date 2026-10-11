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

    expect(KEYS.length).toBe(2461);
    expect(hashes).toEqual({
      en: 'a5503e8a665f1fcd',
      bg: '7e8aaa8281eb85d5',
      zh: '61259be5f68aff9a',
      fr: '208ff1e125b8f1c4',
      de: '32a3a2935e189b3f',
      it: 'e6523f10b6eee0de',
      ja: '67f0221c217fc3f0',
      ko: '6870c8b07bc108a6',
      pl: '1e4d7f11decee741',
      pt: 'b557864abb67e194',
      ro: '5c03ecac1d562619',
      ru: '033d63fd9c5ce348',
      es: 'b79d27cbf5db2acb',
      th: 'e3c19a636f339c8e',
      vi: 'daa2004aeb791c01',
    });
  });
});
