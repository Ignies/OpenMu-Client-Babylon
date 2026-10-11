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

    expect(KEYS.length).toBe(2492);
    expect(hashes).toEqual({
      en: '9a8857799e1aa512',
      bg: '9933115fdc21cf86',
      zh: '266c4fd37670d3ef',
      fr: 'a973a7f59869b7a6',
      de: 'fc12f375e61a70f8',
      it: '8bdbfdb690064994',
      ja: 'adc5803d8b9b43be',
      ko: 'f0af7be3c3bbfb6e',
      pl: 'fe453a25b8624552',
      pt: 'd06cf5c717deed73',
      ro: 'c795916a3dc8281f',
      ru: '466e237c14387ab7',
      es: '9f794e4e0004ae7b',
      th: '1a7d6e03b62a1ba4',
      vi: '8d4188d3c65d5b55',
    });
  });
});
