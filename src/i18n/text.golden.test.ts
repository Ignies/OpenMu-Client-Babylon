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

    expect(KEYS.length).toBe(2546);
    expect(hashes).toEqual({
      en: 'bb59ec986ba1c026',
      bg: 'cc44c473d8dce376',
      zh: '1bb53d341926431d',
      fr: 'fc04cd3d535e2fb6',
      de: '0db37c0b886e14a1',
      it: 'c1ae7a9281651207',
      ja: '58d6280935387ce9',
      ko: 'f9889167926ca956',
      pl: 'f6e2cac3755f4bf6',
      pt: '9cd4c3dc61f43650',
      ro: '668f054aa32982ab',
      ru: '9a8afc5e578793a7',
      es: '1a1414a0559fce1a',
      th: '10d78d732f27390f',
      vi: '57b3e4b93415df02',
    });
  });
});
