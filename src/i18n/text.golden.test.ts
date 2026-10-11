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

    expect(KEYS.length).toBe(2463);
    expect(hashes).toEqual({
      en: '5dec7dcf4631507e',
      bg: '1e806dba086ca924',
      zh: '7d5aedb9ca7f2e4a',
      fr: '6d5cc71256457b92',
      de: '6c0c4cf831fd7bdc',
      it: '411a114ca681f3b4',
      ja: '2f771675d342e85b',
      ko: '51d77ae19682da2e',
      pl: 'bf148895cc849154',
      pt: '02e053ec74d1ea63',
      ro: 'a7cba06c53dd6ab3',
      ru: '6063c3ec1c95516a',
      es: '962a62cadc9260be',
      th: 'f664bf04f9eb172b',
      vi: '44b42af7eb1b170f',
    });
  });
});
