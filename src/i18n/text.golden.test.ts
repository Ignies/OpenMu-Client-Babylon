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

    expect(KEYS.length).toBe(2571);
    expect(hashes).toEqual({
      en: '8e66599000afa43c',
      bg: 'be234c5cb959c9b0',
      zh: '9c9f3326d9b2cfc8',
      fr: 'b491d156c03424c5',
      de: '8e4fac7788c1e915',
      it: '1d61b7910d617373',
      ja: '17c7a489f7d5c1f4',
      ko: 'a9648c1de385826a',
      pl: '6ab971d7ccdd8290',
      pt: 'b0c42fa9f9587f11',
      ro: 'feb036924f1186f0',
      ru: 'af227156c94bab54',
      es: '78777f523ddaff50',
      th: 'd60804a0be705889',
      vi: '01ed57850ef45f39',
    });
  });
});
