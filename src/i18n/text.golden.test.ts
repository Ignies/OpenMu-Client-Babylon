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

    expect(KEYS.length).toBe(2344);
    expect(hashes).toEqual({
      en: '3361122766018d2a',
      bg: '76130dbcea1d6f49',
      zh: '97367cfd34445e85',
      fr: '8e098c965f9edc0c',
      de: '46d604b7f731030c',
      it: '7e82b37f2671b5bb',
      ja: 'cffa383f83fb5f4e',
      ko: '8becf81be24083fa',
      pl: 'd3b78f1028a22465',
      pt: 'e49d618fc6d41337',
      ro: '840dc8476bdf13ab',
      ru: 'c5644b0ed767f881',
      es: 'a59b9ca212171929',
      th: 'fd2c7ef57c2e0e14',
      vi: '1a25bf7ae04a7c7d',
    });
  });
});
