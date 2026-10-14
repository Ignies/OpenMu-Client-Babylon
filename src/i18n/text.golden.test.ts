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

    expect(KEYS.length).toBe(2595);
    expect(hashes).toEqual({
      en: '88bc5ba0cbbc6f88',
      bg: 'fc481efe2bf2a325',
      zh: 'e3e12bc3836acf50',
      fr: '47dae62397213f35',
      de: '849c6309b40bfc79',
      it: '539019a712dc7752',
      ja: 'a29ed9a2f2d8d035',
      ko: '5ce1efacdfeb954a',
      pl: 'e25591fcb97a60c8',
      pt: '746b7e1cea196fc7',
      ro: '5af7ab4203fd9afe',
      ru: '7baeced5428f84e1',
      es: '4fbfb18ae8a710ea',
      th: '7a9a067fe97162d0',
      vi: 'de97b0eac34a39f9',
    });
  });
});
