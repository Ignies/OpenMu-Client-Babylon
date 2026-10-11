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

    expect(KEYS.length).toBe(2515);
    expect(hashes).toEqual({
      en: '79b7afbb18caa0ab',
      bg: 'afa4721024e32eb4',
      zh: '5a01910591469e44',
      fr: '50009230b2a7fb88',
      de: '2ea5d968539f502a',
      it: '64d8cb98c1366a2d',
      ja: 'd6f81f724273ad45',
      ko: 'f45831aba9e93354',
      pl: '591d7344c1989ec6',
      pt: '90b575d0077935a1',
      ro: '25e0bcead44f3c44',
      ru: '10ac75f1c6b2803b',
      es: 'bb617719e08531c3',
      th: 'eaa72dc250b67766',
      vi: 'cc62c05745c3b426',
    });
  });
});
