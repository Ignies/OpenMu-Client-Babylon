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

    expect(KEYS.length).toBe(2462);
    expect(hashes).toEqual({
      en: 'a0ed5c3a65a94394',
      bg: 'be77fef2d8ba9a0d',
      zh: 'e5a13b4407eb5052',
      fr: '0185a58050f93189',
      de: 'c5c642130e749b9f',
      it: '3b34ea737af71993',
      ja: 'b74a803d83937dac',
      ko: 'be912d24bc496211',
      pl: '3939cdcec6e313bd',
      pt: '2541fa0f2aa0fa09',
      ro: '2309c4c3c2e6d5aa',
      ru: '7926b34717dbb53a',
      es: '23b0abac7f4c3662',
      th: '97555fec3ff713dc',
      vi: '855c42e1b777dc67',
    });
  });
});
