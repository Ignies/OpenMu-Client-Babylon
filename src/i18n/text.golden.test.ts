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

    expect(KEYS.length).toBe(2364);
    expect(hashes).toEqual({
      en: 'c4f3abe7bbeccec3',
      bg: '351107b050928ea7',
      zh: '35d4a0ac06d4af05',
      fr: 'c97ad4d0a7aef5b1',
      de: 'e34601c2973c69de',
      it: '59bcc2f0a5678c3a',
      ja: '77028324f788e86f',
      ko: '9188e411d7be4b62',
      pl: '52fc1da1f7f0dcea',
      pt: '85c835d937f4de77',
      ro: 'e11489f42eaa45e7',
      ru: '9bd1b0494f19b17b',
      es: '846cf68c6543d8cf',
      th: 'cc0d5381e97beba8',
      vi: 'b35e2ee0cea62129',
    });
  });
});
