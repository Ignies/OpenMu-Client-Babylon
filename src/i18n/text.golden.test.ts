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

    expect(KEYS.length).toBe(2640);
    expect(hashes).toEqual({
      en: '544ced3d91139801',
      bg: 'd194a222bfa64797',
      zh: '7648439d402221ae',
      fr: '9250ef047d39ae17',
      de: '43b0d42f5bce0b7a',
      it: 'a472b9f242991c12',
      ja: '135032b994caaedb',
      ko: 'e146b1e309cb8764',
      pl: 'ab1b7bfe910457e2',
      pt: '819a0071da3588f5',
      ro: '37b74292d7196cab',
      ru: 'ed68556919de2831',
      es: 'fd92ec6a364869ec',
      th: '5e963196a581e2f1',
      vi: 'd71dcaedecb9ec0f',
      ar: '2ab4655cca15eae3',
      bn: '766854f74f980325',
      ca: 'c6c09eaf7bae2808',
      cs: '2bf0c9717796b5ab',
      el: 'f617d1dedbe41e17',
      eu: '9bd1d3616825770e',
      fa: '0acc86492975b105',
      fil: 'ad529c4ea3e6c8b8',
      hi: '738e2d6d60bb8663',
      hu: 'dda7af4dbf75b95f',
      id: 'c61a95e20a52c4d4',
      'sr-Latn': '5e8e59a045447029',
      tr: '67649f7c00cdf093',
      uk: '85dfe2816dcb3475',
      ur: '71e1f2b7fa975499',
      'zh-Hant': '34918d980516b80b',
    });
  });
});
