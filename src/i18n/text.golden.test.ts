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

    expect(KEYS.length).toBe(2604);
    expect(hashes).toEqual({
      en: 'dffef43926b3d718',
      bg: 'd0f473463bb88e4d',
      zh: '9d433cf75d215888',
      fr: 'b02fcc1fe296632a',
      de: '490c7d10ff009ae3',
      it: '91e2d7429d95255c',
      ja: '4d4d4a7efd4b94ca',
      ko: '8e00a7894772b784',
      pl: '9cf69d3b768b951b',
      pt: '0b17701dcaae19d0',
      ro: '05e93e8407d81e6d',
      ru: 'f974258c73675872',
      es: 'a3913e6886a7161c',
      th: '337c5008485fd0e7',
      vi: 'd62c1e0901c5e927',
    });
  });
});
