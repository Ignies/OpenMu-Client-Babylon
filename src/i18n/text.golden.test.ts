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
      en: '8b3a9c8f05a1001f',
      bg: '593dddf6acd65566',
      zh: 'cb2ad491bf5e6859',
      fr: '35f3703906240829',
      de: '55214413468ea593',
      it: '5a026faf3b078c06',
      ja: 'd77f417d60919b67',
      ko: '0082a8259830eec8',
      pl: '0bfef8b367565104',
      pt: 'df7aa4caca5f93f6',
      ro: '78b6826145a59e03',
      ru: '46acfb4a9645fe77',
      es: '22ee15bcb59f0ea2',
      th: '91988d1168861403',
      vi: '9898414ec9a58d1d',
    });
  });
});
