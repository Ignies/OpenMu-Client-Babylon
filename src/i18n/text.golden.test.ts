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

    expect(KEYS.length).toBe(2499);
    expect(hashes).toEqual({
      en: '2e91c34d23bbbecb',
      bg: '780f2db2d361dd37',
      zh: '79ee88bd5586051f',
      fr: '94082eecba1fb0a5',
      de: 'e99142822f55d2f6',
      it: '65af85ed2958cbf6',
      ja: '9263c2ca95126427',
      ko: '8795f06ca80656a6',
      pl: '8d9240a95a4d0031',
      pt: '2c46105c5f7e281b',
      ro: '8866f38f6b97745a',
      ru: '8daeb089c37e3a86',
      es: '87864271c4c428df',
      th: '95492651729ec8f9',
      vi: 'a50c245b014b801b',
    });
  });
});
