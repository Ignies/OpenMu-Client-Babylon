import { describe, expect, it } from 'vitest';
import { LANGUAGE_LAYERS } from './layers';
import { builtInText, type TextSource } from './sources';
import { textProblems } from './coverage';

/**
 * Every built-in owner (`<owner>/i18n/`) has an `en.ts` and translates every
 * one of its keys in every language, keeping every `{hole}` and `%` spec. A
 * missing line would only show English on screen, which is easy to ship by
 * accident. Streamed modules need only English and are not checked here.
 */

const FILES = builtInText();
const CODES = LANGUAGE_LAYERS.map(l => l.code);

describe('text coverage', () => {
  it('finds the built-in text', () => {
    expect(FILES.filter(f => f.code === 'en').length).toBeGreaterThan(50);
  });

  it('every owner translates every key in every language', () => {
    expect(textProblems(FILES, CODES)).toEqual([]);
  });
});

describe('coverage rules', () => {
  const file = (owner: string, code: string, strings: Record<string, string>): TextSource => ({
    path: `${owner}/i18n/${code}.ts`,
    owner,
    code,
    strings,
  });

  it('flags a missing language file, a missing line and a stray key', () => {
    const files = [
      file('a', 'en', { 'a.one': 'One', 'a.two': 'Two' }),
      file('a', 'fr', { 'a.one': 'Un', 'a.three': 'Trois' }),
    ];
    expect(textProblems(files, ['en', 'fr', 'de'])).toEqual([
      'a/i18n/fr.ts misses a.two',
      'a/i18n/fr.ts has a.three, which a/i18n/en.ts does not',
      'a/i18n/de.ts is missing',
    ]);
  });

  it('flags a dropped placeholder or format spec', () => {
    const files = [
      file('a', 'en', { 'a.hi': 'Hi {name}', 'a.n': '%d left' }),
      file('a', 'fr', { 'a.hi': 'Salut', 'a.n': '%s restants' }),
    ];
    expect(textProblems(files, ['en', 'fr'])).toEqual([
      'a/i18n/fr.ts a.hi does not keep the placeholders of English',
      'a/i18n/fr.ts a.n does not keep the placeholders of English',
    ]);
  });

  it('flags a key owned twice, an owner without English and an unknown language', () => {
    const files = [
      file('a', 'en', { 'x.one': 'One' }),
      file('b', 'en', { 'x.one': 'One' }),
      file('c', 'fr', { 'c.one': 'Un' }),
      file('a', 'xx', { 'x.one': 'One' }),
    ];
    expect(textProblems(files, ['en'])).toEqual([
      'x.one is owned by both a and b',
      'c/i18n has no en.ts',
      'c/i18n/fr.ts is not a language in layers.ts',
      'a/i18n/xx.ts is not a language in layers.ts',
    ]);
  });
});
