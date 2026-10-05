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

    expect(KEYS.length).toBe(2350);
    expect(hashes).toEqual({
      en: '7364c814c0abb633',
      bg: 'fc5dfb05aaf998ce',
      zh: '34660555ebbb0a74',
      fr: 'afccb4a0478825ce',
      de: 'c45cb2770a6d72f7',
      it: 'b979b0d8a3567b90',
      ja: '0bd54bb822c62b26',
      ko: '3d7689688b8f32cf',
      pl: '9531216407947ede',
      pt: '40aedf68eb0e8a14',
      ro: '9e62180934030b22',
      ru: '7bf8515b131623be',
      es: '2455df9c498899a7',
      th: 'e9a9301e40fa20fb',
      vi: '5e2b466b2a507c5b',
    });
  });
});
