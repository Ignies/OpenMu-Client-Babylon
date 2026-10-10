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

    expect(KEYS.length).toBe(2393);
    expect(hashes).toEqual({
      en: '3c16a543f52f5c28',
      bg: '6a749ce832a00ad5',
      zh: '09c6fcd5689c1250',
      fr: '918a5cd8eb6a74fb',
      de: '196debaf3c09fb02',
      it: '10743a353f4a0ccc',
      ja: '90a00e7534e94141',
      ko: '0e6ac273c998dcff',
      pl: '9c909c6fbb0b06b7',
      pt: '25d9d097d06ec1c8',
      ro: '278a03ead8b8cfca',
      ru: 'b4da3cfd0cd3fce1',
      es: '22076ccb2930bb0a',
      th: '1df52ed09cab9b55',
      vi: 'dd588a8b6fba9326',
    });
  });
});
