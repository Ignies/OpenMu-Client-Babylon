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

    expect(KEYS.length).toBe(2495);
    expect(hashes).toEqual({
      en: '1ccee914ceb291d9',
      bg: 'e3d86c3a80d46f53',
      zh: '3e01baeb57976e09',
      fr: 'b70b902156676c13',
      de: '82f5e951a7198f2f',
      it: 'c5928d739bb134d8',
      ja: '722c0497be5fe8b7',
      ko: 'cc4b8334668b574a',
      pl: '07a0a82302fa24f7',
      pt: '8cf26ab5811d34d7',
      ro: 'f267c61b1ced3837',
      ru: '28b54f18df51f30f',
      es: 'edd851663198e715',
      th: '251307f3fd61dcb4',
      vi: '28c849d250c2ec8f',
    });
  });
});
