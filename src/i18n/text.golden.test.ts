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

    expect(KEYS.length).toBe(2517);
    expect(hashes).toEqual({
      en: '2b216e4d0ee87f49',
      bg: 'f47a4d7d6b6934f3',
      zh: '73847491a35862bf',
      fr: 'db034e2698ab0d6e',
      de: 'cec9cc547c59dee4',
      it: '3d059070d5ee182a',
      ja: '935f0662bf540652',
      ko: '7060e496e988a189',
      pl: '311d65d1f30e4fc2',
      pt: '8e7184e06dd1ffc4',
      ro: '3cf5f13995eca04c',
      ru: 'db8943e8d9ab4103',
      es: 'b7d2b20cc471933c',
      th: '33d96da01446c010',
      vi: 'eeed98a379d32ef4',
    });
  });
});
