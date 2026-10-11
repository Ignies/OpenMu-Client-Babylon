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

    expect(KEYS.length).toBe(2432);
    expect(hashes).toEqual({
      en: '0dd7d4d617babeb2',
      bg: '7f449a0d10e96893',
      zh: '3fa72feeb4830f0a',
      fr: '641e6a12b3223dec',
      de: '6a55eb36ed74e7ae',
      it: '01f77b1ed8c0e17c',
      ja: '130d8498a4174a70',
      ko: 'b3e4598c8789d6ec',
      pl: 'abd34630865382f4',
      pt: '4e18da131e3ebe71',
      ro: '2f49113c55123e1e',
      ru: '532fc23175141ceb',
      es: '41ed271987a9d98d',
      th: '5446ffc38d7d0566',
      vi: '83dc6406e5947caf',
    });
  });
});
