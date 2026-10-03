import { describe, expect, it } from 'vitest';
import { LANGUAGE_LAYERS } from './layers';
import { builtInText } from './sources';
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
