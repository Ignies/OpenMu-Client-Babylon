import { describe, expect, it } from 'vitest';
import { EN_TEXT, type TextKey } from './recipes';
import { LANGUAGE_LAYERS } from './layers';

/**
 * A language that falls behind the catalogue still compiles - `strings` is
 * `Partial`, on purpose, so adding a key never breaks a language file - and
 * on screen it just quietly shows English. That is easy to ship by accident,
 * so the gap is a test failure rather than a dev-console warning.
 */

const KEYS = Object.keys(EN_TEXT) as TextKey[];

describe('language coverage', () => {
  for (const layer of LANGUAGE_LAYERS) {
    it(`${layer.name} translates every key`, () => {
      const missing = KEYS.filter(key => layer.strings[key] === undefined);
      expect(missing).toEqual([]);
    });

    it(`${layer.name} keeps every placeholder`, () => {
      const holes = (text: string) =>
        (text.match(/\{\w+\}/g) ?? []).slice().sort().join(',');
      // `%d` / `%s` / `%%`: the original client's own format strings, spliced
      // by their call sites, so a dropped one is a crash rather than a typo.
      const specs = (text: string) =>
        (text.match(/%(?:%|\d*\.?\d*[a-zA-Z]|I64d)/g) ?? []).join(',');

      const broken = KEYS.filter(key => {
        const line = layer.strings[key];
        if (line === undefined) return false;
        return holes(line) !== holes(EN_TEXT[key]) || specs(line) !== specs(EN_TEXT[key]);
      });

      expect(broken).toEqual([]);
    });
  }
});
