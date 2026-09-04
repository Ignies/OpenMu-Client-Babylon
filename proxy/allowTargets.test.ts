import { describe, expect, it } from 'vitest';
import { isInternalHost, parseAllowTargets, targetAllowed } from './allowTargets';

const rules = (raw: string) => parseAllowTargets(raw);

describe('isInternalHost', () => {
  it('flags loopback, private, link-local and localhost', () => {
    for (const h of [
      '127.0.0.1',
      '127.5.6.7',
      '0.0.0.0',
      '10.0.0.1',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254', // cloud metadata
      '100.64.0.1', // cgnat
      'localhost',
      'db.localhost',
      '::1',
      '::',
      '::ffff:127.0.0.1',
      'fe80::1',
      'fd00::1',
    ]) {
      expect(isInternalHost(h), h).toBe(true);
    }
  });

  it('does not flag public hosts', () => {
    for (const h of [
      '8.8.8.8',
      '161.97.111.107',
      '172.15.0.1',
      '172.32.0.1',
      '192.167.0.1',
      'play.example.com',
      '2606:4700::1111',
    ]) {
      expect(isInternalHost(h), h).toBe(false);
    }
  });
});

describe('targetAllowed', () => {
  it('allows anything when unset (local dev)', () => {
    expect(targetAllowed(rules(''), '127.0.0.1', 3001)).toBe(true);
    expect(targetAllowed(rules(''), 'example.com', 80)).toBe(true);
  });

  it('refuses external and other-host targets when pinned', () => {
    const r = rules('127.0.0.1:44405,127.0.0.1:55901');
    expect(targetAllowed(r, 'example.com', 80)).toBe(false);
    expect(targetAllowed(r, '161.97.111.107', 44405)).toBe(false);
    expect(targetAllowed(r, '169.254.169.254', 80)).toBe(false);
  });

  it('allows the pinned game ports', () => {
    const r = rules('127.0.0.1:44405,127.0.0.1:55901');
    expect(targetAllowed(r, '127.0.0.1', 44405)).toBe(true);
    expect(targetAllowed(r, '127.0.0.1', 55901)).toBe(true);
  });

  it('refuses other loopback ports even with the game ports pinned', () => {
    const r = rules('127.0.0.1:44405,127.0.0.1:55901');
    expect(targetAllowed(r, '127.0.0.1', 3001)).toBe(false); // presence
    expect(targetAllowed(r, '127.0.0.1', 22)).toBe(false);
    expect(targetAllowed(r, '127.0.0.1', 3306)).toBe(false);
  });

  it('never lets a host-only rule open an internal target', () => {
    // The bug: `127.0.0.1` with no port used to authorise every loopback port.
    const r = rules('127.0.0.1');
    expect(targetAllowed(r, '127.0.0.1', 44405)).toBe(false);
    expect(targetAllowed(r, '127.0.0.1', 3001)).toBe(false);
  });

  it('never lets a wildcard reach an internal target', () => {
    const r = rules('*.localhost:3001');
    expect(targetAllowed(r, 'db.localhost', 3001)).toBe(false);
  });

  it('keeps host-only and wildcard rules working for public hosts', () => {
    expect(targetAllowed(rules('play.example.com'), 'play.example.com', 55901)).toBe(true);
    expect(targetAllowed(rules('play.example.com'), 'play.example.com', 12345)).toBe(true);
    expect(targetAllowed(rules('*.example.net:55901'), 'gs1.example.net', 55901)).toBe(true);
    expect(targetAllowed(rules('*.example.net:55901'), 'gs1.example.net', 44405)).toBe(false);
    expect(targetAllowed(rules('*.example.net'), 'evil.com', 55901)).toBe(false);
  });
});
