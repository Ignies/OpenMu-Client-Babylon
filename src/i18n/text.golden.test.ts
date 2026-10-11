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
      en: '4f86a798ad9c01dd',
      bg: '8e28bdd9b3a93c5a',
      zh: '5763d3d881d5b9b4',
      fr: '87e4e1c97f1c7708',
      de: '4b528eeb104f9ba7',
      it: 'dbb1ca3ee0fadd13',
      ja: 'be4755bd9d5e9ce1',
      ko: 'e0e6eb995c174094',
      pl: 'dfff370cfd786984',
      pt: 'c100dfce03075820',
      ro: '2148fbe2da48375c',
      ru: '8a73ff04147dfc1c',
      es: '932b9d91ec4f7ac1',
      th: '67284a6e7a3369a6',
      vi: '962623d8df2fb619',
    });
  });
});
