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

    expect(KEYS.length).toBe(2680);
    expect(hashes).toEqual({
      en: '517518c61ccc3651',
      bg: 'cdc838fe4828543c',
      zh: 'f8dcb20797b4062c',
      fr: '59ace69a667d5c13',
      de: '3f6fb5ecee9ddb11',
      it: 'fa02a6a90cecd319',
      ja: 'e944ad564753435a',
      ko: '7881f66fc619ca04',
      pl: '0dd9f18454a24c6c',
      pt: '919af432dc8d4e07',
      ro: '81c5a9dc1d1bd983',
      ru: 'b08de5f76a294656',
      es: '841aae31aa6f0319',
      th: '990001525c06b022',
      vi: '8a4c3cc57ee30fa2',
      ar: 'fedaa13d35aa701a',
      bn: '80be8317fb63ea67',
      ca: '8f24e6f893089ac5',
      cs: '4ab2aaef7a3d4916',
      el: '6295b49372f85b79',
      eu: 'c45ad914eaede1fd',
      fa: 'abf911874b056d7f',
      fil: '50c44ed6c4067567',
      hi: '59e4d9746ffbd846',
      hu: '974a8e99b55b9e0c',
      id: 'fe2ca137af552cea',
      'sr-Latn': 'dd5d36765bc0b971',
      tr: '668931efa47016ba',
      uk: 'e4e31ea0f3c16543',
      ur: '8672bf85e9843f20',
      'zh-Hant': '4f90c3a89364c7a1',
    });
  });
});
