import { beforeEach, describe, expect, it } from 'vitest';
import { SESSION_NONCE_RE, sessionNonce } from '../common/sessionNonce';
import type { Item } from '../ecs/world';
import { cancel, claim, list, payout, release, settle, settlePayout } from './api';

/**
 * The service refuses to sign an escrow token for a body that does not carry
 * the page's session nonce: a ticket says this service once vouched for the
 * account, the nonce says the player is still sitting at the socket. Losing
 * the nonce from the commit bodies makes every list, buy, cancel and collect
 * fail with a session the service cannot recognise, while browsing, which
 * needs no nonce, keeps working - so nothing but a test of the bodies
 * themselves catches it.
 */

type Call = { url: string; body: Record<string, unknown> };

const calls: Call[] = [];

const TICKET = `acct.${Date.now() + 600_000}.${'x'.repeat(43)}`;

function answerFor(url: string): unknown {
  if (url.endsWith('/session')) return { ticket: TICKET, account: 'acct' };
  return { listing: null, token: 'ab', payouts: [], total: 0, paid: 0, remaining: 0 };
}

beforeEach(() => {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : {} });
    return new Response(JSON.stringify(answerFor(url)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
});

const item = { group: 4, num: 7 } as Item;

const commits: [string, () => Promise<unknown>][] = [
  ['list', () => list({ character: 'Hero', slot: 12, price: 1000, category: 'misc', item })],
  ['settle', () => settle('listing-1')],
  ['claim', () => claim('listing-1', 'Hero')],
  ['release', () => release('listing-1')],
  ['cancel', () => cancel('listing-1', 'Hero')],
  ['payout', () => payout('Hero')],
  ['payout settle', () => settlePayout()],
];

describe('a commit body', () => {
  it.each(commits)('carries the session nonce on %s', async (_name, run) => {
    await run();

    const commit = calls.at(-1);
    expect(commit?.url).not.toMatch(/\/session$/);
    expect(String(commit?.body.session)).toMatch(SESSION_NONCE_RE);
    // The same nonce the game socket carries, which is what the proxy binds.
    expect(commit?.body.session).toBe(sessionNonce());
  });

  it.each(commits)('carries the ticket on %s', async (_name, run) => {
    await run();

    expect(calls.at(-1)?.body.ticket).toBe(TICKET);
  });
});
