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

    expect(KEYS.length).toBe(2532);
    expect(hashes).toEqual({
      en: '722ccc4857606a57',
      bg: '863750d466f0f287',
      zh: 'b042ec57281dbf34',
      fr: '962fa1345845a5c6',
      de: '4e7513a167ecf7c4',
      it: 'e918e4976e48cae8',
      ja: '1882c0c68384840d',
      ko: '2203f545c602451c',
      pl: 'a43ad6c44137c622',
      pt: 'd1ea1d275284a7cc',
      ro: '2de73637eb6d8baf',
      ru: '862dee756ca1fc7a',
      es: '4c5c88db09296b9f',
      th: '2cbdd0a153090440',
      vi: '638b53d0c2bcbcff',
    });
  });
});
