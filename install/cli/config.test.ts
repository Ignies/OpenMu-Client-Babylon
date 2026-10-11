import { describe, expect, it } from 'vitest';
import { DEFAULTS, clientOrigin, configToEnv, envToConfig, parseEnvFile, toEnvFile, type Config } from './config';
import * as check from './validate';

const config: Config = {
  ...DEFAULTS,
  domain: 'example.com',
  email: 'ops@example.com',
  postgresPassword: 'Db-pass-12345!',
  adminHash: '$2b$12$abcdefghijklmnopqrstuuF7Z5f1o2PqNnSx0nqGkqk8YxqvQ7H5a',
  escrowSecret: 'escrow',
  marketTicketSecret: 'market',
  shopTicketSecret: 'shop',
  band: false,
  marketFee: 100,
};

describe('config file', () => {
  it('round-trips through the env file', () => {
    const text = toEnvFile(configToEnv(config));
    expect(envToConfig(parseEnvFile(text))).toEqual(config);
  });

  it('quotes every value and keeps symbols literal', () => {
    expect(toEnvFile({ A: 'x@y:z/#1' })).toBe("A='x@y:z/#1'\n");
    expect(parseEnvFile("A='x@y:z/#1'\r\n# note\nB=plain\n")).toEqual({ A: 'x@y:z/#1', B: 'plain' });
  });

  it('stores the held hit request as MU_HELD_HIT_REQUEST, off unless set', () => {
    expect(configToEnv({ ...config, heldHitRequest: true }).MU_HELD_HIT_REQUEST).toBe('on');
    expect(envToConfig({ MU_HELD_HIT_REQUEST: 'on' }).heldHitRequest).toBe(true);
    expect(envToConfig({}).heldHitRequest).toBe(false);
  });

  it('stores the login retry as MU_RETRY_LOGIN_WHEN_CONNECTED, off unless set', () => {
    expect(configToEnv({ ...config, retryLoginWhenConnected: true }).MU_RETRY_LOGIN_WHEN_CONNECTED).toBe('on');
    expect(envToConfig({ MU_RETRY_LOGIN_WHEN_CONNECTED: 'on' }).retryLoginWhenConnected).toBe(true);
    expect(envToConfig({}).retryLoginWhenConnected).toBe(false);
  });

  it('stores the modules turned off as MU_MODULES_OFF, none unless set', () => {
    expect(configToEnv({ ...config, modulesOff: 'events,band' }).MU_MODULES_OFF).toBe('events,band');
    expect(envToConfig({}).modulesOff).toBe('');
  });

  it('fills what an older file does not have from the defaults', () => {
    expect(envToConfig({ MU_DOMAIN: 'old.net' })).toEqual({ ...DEFAULTS, domain: 'old.net' });
  });

  it('names the client origin per mode', () => {
    expect(clientOrigin(config)).toBe('https://play.example.com');
    expect(clientOrigin({ ...config, mode: 'ip', publicIp: '203.0.113.7' })).toBe('http://203.0.113.7');
  });
});

describe('answers', () => {
  it('wants long mixed passwords without characters that break env files', () => {
    expect(check.password('Db-pass-12345!')).toBeUndefined();
    expect(check.password('short-1A')).toMatch(/12/);
    expect(check.password('alllowercaseletters')).toMatch(/3 of/);
    expect(check.password("Has'Quote-123")).toMatch(/not allowed/);
    expect(check.password('Has$Dollar-123')).toMatch(/not allowed/);
    expect(check.password('Has;Semi-12345')).toMatch(/not allowed/);
    expect(check.password('Admin-pass-123', 'admin')).toMatch(/login/);
  });

  it('wants a bare domain', () => {
    expect(check.domain('example.com')).toBeUndefined();
    expect(check.domain('mu.example.co.uk')).toBeUndefined();
    expect(check.domain('https://example.com')).toBeDefined();
    expect(check.domain('play.example.com')).toMatch(/bare/);
  });

  it('checks the rest', () => {
    expect(check.ipv4('203.0.113.7')).toBeUndefined();
    expect(check.ipv4('203.0.113.256')).toBeDefined();
    expect(check.email('ops@example.com')).toBeUndefined();
    expect(check.email('nope')).toBeDefined();
    expect(check.login('gm01')).toBeUndefined();
    expect(check.login('a')).toBeDefined();
    expect(check.listField('My MU')).toBeUndefined();
    expect(check.listField('a:b')).toBeDefined();
  });

  it('makes secrets that are safe in every file they land in', () => {
    const a = check.newSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(check.newSecret()).not.toBe(a);
  });
});
