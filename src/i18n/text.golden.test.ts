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

    expect(KEYS.length).toBe(2589);
    expect(hashes).toEqual({
      en: '6fa31bf45917c2b7',
      bg: '20853534da577eac',
      zh: 'a1c7b977581a9147',
      fr: '161d338ac050a183',
      de: '2aa09746ee3628b2',
      it: 'ad9475c5d50be46e',
      ja: '5f962c37581e4927',
      ko: 'c7b26992307d1a73',
      pl: 'b119436b7dd08ba6',
      pt: '9e8c89a3e32df735',
      ro: 'f7b5ef1a29e19be1',
      ru: '030d357469f95285',
      es: '6f9fe1adfb291de8',
      th: 'c4bc4042268c5a4d',
      vi: '0aada4b416248fde',
    });
  });
});
