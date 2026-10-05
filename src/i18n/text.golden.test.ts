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

    expect(KEYS.length).toBe(2352);
    expect(hashes).toEqual({
      en: 'd9d73e3ccf54bede',
      bg: 'fb0cf1a6f30d0725',
      zh: '7fbb3cda9405e1e1',
      fr: '527bbf5d8ce92303',
      de: 'a2cbc1e21eee6593',
      it: 'a8e1a373ece0b861',
      ja: 'e230bcb2e767a1de',
      ko: '8d6efa61d4b35bb8',
      pl: '58c29b851a137ce4',
      pt: '096ac3091d608251',
      ro: '6717a7ab527a0fc8',
      ru: 'd799351b69b6cf24',
      es: '4ad4a3677f6f70eb',
      th: 'f234a6e522c09560',
      vi: 'af1e97f595ad1e45',
    });
  });
});
