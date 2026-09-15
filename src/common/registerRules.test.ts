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

describe('the password charset', () => {
  const good = { username: 'player', password: 'secret1', confirm: 'secret1' };

  it('takes letters, numbers and basic symbols', () => {
    for (const password of ['secret1', 'p@ss-w0rd', 'a_b.c!1']) {
      expect(validateSignup({ ...good, password, confirm: password })).toBeNull();
    }
  });

  it('refuses anything the ten-byte field cannot carry', () => {
    // One byte per character, read back as UTF-8: an accent is replaced on
    // the way in, so the account could never be logged into.
    for (const password of ['contraseña', 'pässw0rd', 'пароль1', 'pass w0rd']) {
      expect(validateSignup({ ...good, password, confirm: password })).toBe('passwordChars');
    }
  });

  it('complains about the length first, so the message names one thing', () => {
    expect(validateSignup({ ...good, password: 'ñ', confirm: 'ñ' })).toBe(
      'passwordShort'
    );
  });
});
