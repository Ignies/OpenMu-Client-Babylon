import { describe, expect, test } from 'bun:test';

process.env.MARKETPLACE_TICKET_SECRET = 'test-secret-for-the-marketplace';

const { mintTicket, verifyTicket, TICKET_TTL_MS } = await import('./identity');

/**
 * The ticket is the only thing standing between a request and somebody else's
 * account, so these are the tests that matter most in the service.
 */
describe('minting', () => {
  test('an account is lowercased, because the game treats logins that way', () => {
    expect(mintTicket('Player').account).toBe('player');
  });

  test('a name the presence server could never produce is refused outright', () => {
    expect(() => mintTicket('has a space')).toThrow();
    expect(() => mintTicket('waytoolongaccountname')).toThrow();
    expect(() => mintTicket('semi;colon')).toThrow();
  });
});

describe('verifying', () => {
  test('a freshly minted ticket verifies as its own account', () => {
    const { ticket } = mintTicket('alice');
    expect(verifyTicket(ticket)).toMatchObject({ ok: true, account: 'alice' });
  });

  test('anything that is not a well formed ticket is malformed, not accepted', () => {
    for (const bad of [undefined, null, 42, '', 'alice', 'alice.123', 'a.b.c.d', {}]) {
      expect(verifyTicket(bad)).toMatchObject({ ok: false, reason: 'malformed' });
    }
  });

  test('a tampered account is forged, not accepted as that account', () => {
    const { ticket } = mintTicket('alice');
    const [, expiry, mac] = ticket.split('.');
    expect(verifyTicket(`mallory.${expiry}.${mac}`)).toMatchObject({ ok: false, reason: 'forged' });
  });

  test('an extended expiry is forged, because the expiry is signed too', () => {
    const { ticket, expiresAt } = mintTicket('alice');
    const [account, , mac] = ticket.split('.');
    const later = expiresAt + 60 * 60 * 1000;
    expect(verifyTicket(`${account}.${later}.${mac}`)).toMatchObject({ ok: false, reason: 'forged' });
  });

  test('a made up signature is forged', () => {
    const { ticket } = mintTicket('alice');
    const [account, expiry, mac] = ticket.split('.');
    const other = `${mac.slice(0, -1)}${mac.endsWith('A') ? 'B' : 'A'}`;
    expect(verifyTicket(`${account}.${expiry}.${other}`)).toMatchObject({ ok: false, reason: 'forged' });
  });

  test('a ticket past its life is expired', () => {
    const now = Date.now();
    const { ticket } = mintTicket('alice', now);
    expect(verifyTicket(ticket, now + TICKET_TTL_MS + 1)).toMatchObject({
      ok: false,
      reason: 'expired',
    });
  });

  test('it is still good a moment before it expires', () => {
    const now = Date.now();
    const { ticket } = mintTicket('alice', now);
    expect(verifyTicket(ticket, now + TICKET_TTL_MS - 1)).toMatchObject({ ok: true });
  });
});
