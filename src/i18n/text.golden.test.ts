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

    expect(KEYS.length).toBe(2565);
    expect(hashes).toEqual({
      en: '30b625a92cf5b159',
      bg: 'acc08c6fd7845212',
      zh: 'b8688bb49be44704',
      fr: 'a17589a38f446660',
      de: '5373b89655a62f79',
      it: 'dd6133e1e4c8e940',
      ja: '380e3518e6f64349',
      ko: 'fb483dab99ca35c0',
      pl: '993fbe84f3fe1e35',
      pt: 'a16627c81d1c4593',
      ro: 'becfe92357dadfc3',
      ru: '3a241f7274eaacb0',
      es: 'e51b49a4757c3d8a',
      th: '6e69e55bfd08c4e9',
      vi: '7a590d6bf3fcad06',
    });
  });
});
