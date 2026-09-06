import { describe, expect, it } from 'vitest';
import { validateSignup } from './registerRules';

const good = { username: 'player', password: 'secret', confirm: 'secret' };

describe('validateSignup', () => {
  it('accepts a well-formed signup', () => {
    expect(validateSignup(good)).toBeNull();
  });

  it('names the first thing wrong, in field order', () => {
    // A short ID *and* a mismatch: the ID is what the player is looking at.
    expect(
      validateSignup({ username: 'ab', password: 'secret', confirm: 'other' })
    ).toBe('idShort');
  });

  it('rejects an empty field before anything else', () => {
    expect(validateSignup({ ...good, confirm: '' })).toBe('empty');
  });

  it('rejects an ID that is not letters and numbers', () => {
    expect(validateSignup({ ...good, username: 'pla yer' })).toBe('idChars');
  });

  it('rejects a short password', () => {
    expect(validateSignup({ ...good, password: 'abc', confirm: 'abc' })).toBe(
      'passwordShort'
    );
  });

  it('rejects a confirmation that does not match', () => {
    expect(validateSignup({ ...good, confirm: 'secrets' })).toBe('mismatch');
  });
});
