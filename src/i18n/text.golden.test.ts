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

    expect(KEYS.length).toBe(2606);
    expect(hashes).toEqual({
      en: '27aec2c312dc3c9a',
      bg: '86e6f17399b34a58',
      zh: 'd3fef1ddb3429d61',
      fr: '08271f3a3f1ac948',
      de: 'ed7303cf7d24b9a1',
      it: 'd35ae461d358bc05',
      ja: 'a88b9a0ef04081d9',
      ko: 'c27ad56f3485891e',
      pl: '80b4923b5c8e1647',
      pt: 'dd3d93e5629ada7d',
      ro: 'ca8c3e96af443248',
      ru: 'b9ea500e06298763',
      es: '076827ea5d33b68b',
      th: 'd9309fb5045c85a0',
      vi: '0c4f457eae65450a',
    });
  });
});
