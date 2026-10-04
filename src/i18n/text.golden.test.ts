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

    expect(KEYS.length).toBe(2348);
    expect(hashes).toEqual({
      en: '6343d20b3d67239a',
      bg: '04c565e76d490a5a',
      zh: 'd28ba6610efe19aa',
      fr: 'cffa43d3bf1db48e',
      de: '508e61cb136c174d',
      it: '6769b3cccb32ba71',
      ja: 'bf091b3e0f94a1d5',
      ko: '237b2b114c6d4d85',
      pl: 'ca80e417661b52dc',
      pt: '0c717b3a93549976',
      ro: 'e6e1bbfdfbb4f0f7',
      ru: '82ea6ac2f286f3a5',
      es: 'f1cade1d5b19a791',
      th: '870273e9b8fb14b4',
      vi: 'a5ca658ad270dfdd',
    });
  });
});
