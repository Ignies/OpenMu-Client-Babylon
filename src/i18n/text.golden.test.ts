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

    expect(KEYS.length).toBe(2591);
    expect(hashes).toEqual({
      en: '6b57dd7eb79f05be',
      bg: 'e4aafbfb8bff7954',
      zh: '8acd23fc03d93999',
      fr: '9dc08c2475c06b37',
      de: '072376240635a28f',
      it: '69913b7d15741b73',
      ja: '8243b553174ac6a4',
      ko: '338ea55499d1e31c',
      pl: 'fbf31ba792d670d9',
      pt: '74a339fb42871600',
      ro: 'dbac4981505ec01b',
      ru: '09968ed97be0761b',
      es: '52e1cce351aa822f',
      th: '23ac4f8e6149efe5',
      vi: '45b31a8aafcbc24f',
    });
  });
});
