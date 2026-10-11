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

    expect(KEYS.length).toBe(2497);
    expect(hashes).toEqual({
      en: '059bdc667ce3e369',
      bg: 'fb3297521925fc0d',
      zh: '823b61822c5c92b1',
      fr: 'ead3dc494c83590a',
      de: '2d7e7eddf2c2cfea',
      it: '119f562860d64ce3',
      ja: 'd1e2f383ed0e6acb',
      ko: '5a1ca52b27c9dfa7',
      pl: '0fb90f91c4caa103',
      pt: '456ba447264e6cbb',
      ro: 'edf474e926990390',
      ru: '34a22150ec0662ee',
      es: '6e97f268e523ba3c',
      th: 'c4c98fa95f2f8f0f',
      vi: '19657eaa515a77e3',
    });
  });
});
