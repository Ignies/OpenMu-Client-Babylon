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

    expect(KEYS.length).toBe(2493);
    expect(hashes).toEqual({
      en: 'ce6bbab45d3d0ec1',
      bg: 'd86bae9998c31300',
      zh: '6b06fd0230f877e3',
      fr: 'fe3d16b6f50f0b38',
      de: '334ff61c4e960524',
      it: '8227ec75eb0d1f4e',
      ja: '7c3e79cd1ebccb26',
      ko: '808fab667be4499f',
      pl: '7173f4ca451dbb97',
      pt: '3ba97f90278a95cb',
      ro: 'ee8b3655b5495e57',
      ru: 'f2d15ee0d7ebab71',
      es: '414adc5be4d8fec2',
      th: 'bc76cf78288db023',
      vi: '9712ba1a4ee8ed45',
    });
  });
});
