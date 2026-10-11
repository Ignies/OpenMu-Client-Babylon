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

    expect(KEYS.length).toBe(2567);
    expect(hashes).toEqual({
      en: '87fdbb000062268e',
      bg: '2d635a6ef59857b1',
      zh: '65a1013e946680b6',
      fr: '0e8654043899662c',
      de: 'd78bea19f943d747',
      it: 'aff03680defa3e30',
      ja: '416df441bec7095b',
      ko: 'f945ac5dd829bd7b',
      pl: 'e98825d8e573e1c1',
      pt: 'd637a121e69e1771',
      ro: 'bc2cb1825093eb89',
      ru: 'faccd6857690ae0e',
      es: 'd605052c730275bd',
      th: '02b41fae0ecb4cd4',
      vi: 'e581316b1157d969',
    });
  });
});
