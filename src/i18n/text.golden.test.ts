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

    expect(KEYS.length).toBe(2520);
    expect(hashes).toEqual({
      en: '35cf482be16ca9fb',
      bg: '89efa08fb5f4f7ae',
      zh: '7a514a48ce34c44b',
      fr: 'ab314944e9f923f7',
      de: '6867f4b2d2454c56',
      it: 'ca045c00ac321575',
      ja: '0fe210961a82ab73',
      ko: 'c74754e732b61436',
      pl: 'a79f1fbcff3776d2',
      pt: 'b522942bb705bfbd',
      ro: '24e88120fe209459',
      ru: '1e26c684f9162836',
      es: '62d490aea988d7d6',
      th: '6b6089d746903bd2',
      vi: 'a4e67126e530a54e',
    });
  });
});
