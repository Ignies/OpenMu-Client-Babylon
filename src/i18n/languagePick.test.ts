import { describe, expect, it } from 'vitest';
import { pickLanguage } from './index';

const layers = [{ code: 'en' }, { code: 'es' }, { code: 'ja' }, { code: 'pt', aliases: ['pt-BR'] }] as never;

// The website hands its choice over as `?lang=` or, on first run, a `mu_language` cookie.
describe('the language a boot picks', () => {
  it('takes the link from the website first', () => {
    expect(pickLanguage(layers, { query: 'ja', stored: 'es', cookie: 'es', browser: ['en'] })).toEqual({ code: 'ja', fromLink: true });
    expect(pickLanguage(layers, { query: 'pt-BR', stored: null, cookie: null, browser: [] })).toEqual({ code: 'pt', fromLink: true });
  });

  it('keeps the language picked in the game over the cookie', () => {
    expect(pickLanguage(layers, { query: null, stored: 'es', cookie: 'ja', browser: ['en'] }).code).toBe('es');
  });

  it('follows the website cookie on first run, then the browser', () => {
    expect(pickLanguage(layers, { query: null, stored: null, cookie: 'ja', browser: ['es'] }).code).toBe('ja');
    expect(pickLanguage(layers, { query: null, stored: null, cookie: null, browser: ['es-MX'] }).code).toBe('es');
  });

  it('ignores a language the game does not have', () => {
    expect(pickLanguage(layers, { query: 'xx', stored: 'yy', cookie: 'zz', browser: ['qq'] })).toEqual({ code: 'en', fromLink: false });
  });
});
