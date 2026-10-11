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

    expect(KEYS.length).toBe(2487);
    expect(hashes).toEqual({
      en: '99e499f86179095a',
      bg: 'c4cbb44e0a2fa12d',
      zh: '9330b1e371b46b5f',
      fr: 'b4a9e575bb57637d',
      de: '2ffe0541615691ef',
      it: '004d05bda8684355',
      ja: '7512258ed46a44cf',
      ko: 'c5a3e14c7b7435af',
      pl: '8485d9d64dc40846',
      pt: '8b844b525211418e',
      ro: '4ebb4c3ebbc6819c',
      ru: '71e3e394f29cfc1d',
      es: 'de395a0142dac777',
      th: 'cedc78791bb5f5ed',
      vi: 'ec6e82dfa04e96aa',
    });
  });
});
