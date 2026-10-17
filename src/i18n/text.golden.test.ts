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

    expect(KEYS.length).toBe(2622);
    expect(hashes).toEqual({
      en: 'ed1486b4c4c78c32',
      bg: 'f77357acf2fa3c65',
      zh: '01ecdb1c0e49ba47',
      fr: '09f0aa999c99064d',
      de: 'a0477f4cc737f80a',
      it: '3f2dccfbd5747c79',
      ja: 'e82985a31896e728',
      ko: '9ca73c4ae450c71b',
      pl: 'edcd6ffe75d86859',
      pt: '0ac526907e44b648',
      ro: 'a909aeb4909b68b3',
      ru: '44e60ee96c8c7385',
      es: '387dca5aa0753ee0',
      th: '8d1e305febe3860e',
      vi: 'da5dde18a1096714',
      ar: 'dcc81f7f4d0b5987',
      bn: '6fbba44635aa982b',
      ca: '53b42877a5c73f08',
      cs: 'a94e7d1de3ba6f75',
      el: '34f0376c4d56f13d',
      eu: '2de2a8b4dcca7fbd',
      fa: 'b4fa46a7a82aa53f',
      fil: 'a9d360b944f22030',
      hi: 'a20f61fd17058bae',
      hu: 'cb742dd01050631b',
      id: '9993ceb02a0a20de',
      'sr-Latn': 'de04442d7f358a96',
      tr: 'aac89efe316dbdb4',
      uk: 'a43dafd6535278c5',
      ur: '2ca253974ce8220c',
      'zh-Hant': '6e52bdd304af2156',
    });
  });
});
