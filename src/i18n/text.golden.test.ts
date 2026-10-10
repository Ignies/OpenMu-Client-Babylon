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
      en: '1d7f4627d96a2863',
      bg: 'd229bfa7a5277d28',
      zh: 'ec61564d75fe5f5d',
      fr: '570b062a4a520247',
      de: '5c74b562b3b3f1db',
      it: '3650546ff34767eb',
      ja: '29c53ceb118cd456',
      ko: '09225c5b01680948',
      pl: '585c1dfc467cd5b0',
      pt: '0df5595cf627a1cd',
      ro: 'c417a12dc15927fe',
      ru: 'e235694621eea275',
      es: 'd60e22db6d6d31be',
      th: 'a4e1fe5ea72d3b6d',
      vi: 'a2a18961f1d725dc',
    });
  });
});
