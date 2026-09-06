import { describe, expect, it } from 'vitest';
import { BurstLimit, bucketFor, clientIp, isLoopback } from './rateLimit';

function request(forwarded?: string): Request {
  return new Request('http://127.0.0.1:3200/api/session', {
    headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
  });
}

function peer(address: string | null) {
  return { requestIP: () => (address === null ? null : { address }) };
}

describe('bucketFor', () => {
  it('counts IPv4 whole, mapped or not', () => {
    expect(bucketFor('203.0.113.9')).toBe('203.0.113.9');
    expect(bucketFor('::ffff:203.0.113.9')).toBe('203.0.113.9');
    expect(bucketFor('[::ffff:203.0.113.9]')).toBe('203.0.113.9');
  });

  it('counts IPv6 by its /64', () => {
    expect(bucketFor('2001:db8:1:2:3:4:5:6')).toBe('2001:0db8:0001:0002::/64');
    expect(bucketFor('2001:db8::1')).toBe('2001:0db8:0000:0000::/64');
    expect(bucketFor('fe80::1%eth0')).toBe('fe80:0000:0000:0000::/64');
  });
});

describe('isLoopback', () => {
  it('knows every spelling of the local host', () => {
    for (const address of ['127.0.0.1', '127.9.9.9', '::1', '::ffff:127.0.0.1', '[::1]']) {
      expect(isLoopback(address), address).toBe(true);
    }
  });

  it('does not mistake a neighbour for it', () => {
    for (const address of ['10.0.0.1', '203.0.113.9', '::ffff:10.0.0.1', '2001:db8::1', '::']) {
      expect(isLoopback(address), address).toBe(false);
    }
  });
});

describe('clientIp', () => {
  it('takes the hop Caddy appended when Caddy is the peer', () => {
    expect(clientIp(request('198.51.100.7'), peer('127.0.0.1'))).toBe('198.51.100.7');
    expect(clientIp(request('9.9.9.9, 198.51.100.7'), peer('::1'))).toBe('198.51.100.7');
  });

  it('ignores the header from a peer that is not on this box', () => {
    expect(clientIp(request('198.51.100.7'), peer('203.0.113.9'))).toBe('203.0.113.9');
    expect(clientIp(request('9.9.9.9, 198.51.100.7'), peer('::ffff:10.0.0.4'))).toBe('::ffff:10.0.0.4');
  });

  it('falls back to the socket, then to unknown', () => {
    expect(clientIp(request(), peer('127.0.0.1'))).toBe('127.0.0.1');
    expect(clientIp(request(' , '), peer('127.0.0.1'))).toBe('127.0.0.1');
    expect(clientIp(request('198.51.100.7'), peer(null))).toBe('unknown');
  });
});

describe('BurstLimit', () => {
  it('allows the limit and refuses the attempt after it, per bucket', () => {
    const limit = new BurstLimit(2, 1000);

    expect(limit.hammering('a', 0)).toBe(false);
    expect(limit.hammering('a', 1)).toBe(false);
    expect(limit.hammering('a', 2)).toBe(true);
    expect(limit.hammering('b', 2)).toBe(false);
  });

  it('forgets attempts that fell out of the window', () => {
    const limit = new BurstLimit(1, 1000);

    expect(limit.hammering('a', 0)).toBe(false);
    expect(limit.hammering('a', 500)).toBe(true);
    expect(limit.hammering('a', 1200)).toBe(true);
    expect(limit.hammering('a', 2500)).toBe(false);
  });
});
