import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseServerLine } from './serverList';
import { registerApiUrl, registerUrl, shopApiUrl } from './serverServices';
import type { ServerProfile } from './serverConfig';

const world = (line: string): ServerProfile => {
  const parsed = parseServerLine(line);

  if (!parsed) throw new Error(`line did not parse: ${line}`);

  return parsed;
};

const listed = world('[S6EP3:Ignies:A world:es](ignies.net)');
const addressed = world('[S6EP3:Somewhere:A world:en](10.0.0.4:44405@wss://gate.example.net)');

describe('registerUrl', () => {
  it('sends a domain world to its own signup page', () => {
    expect(registerUrl(listed)).toBe('https://register.ignies.net');
  });

  // Nothing is offered rather than the build's own page: the link would take a
  // player registering for one world to somebody else's.
  it('has nowhere to send a world that published only an address', () => {
    expect(registerUrl(addressed)).toBe('');
  });
});

describe('registerApiUrl', () => {
  // The fallback is a build-time variable, so a developer's own `.env` would
  // otherwise decide what this test proves.
  afterEach(() => vi.unstubAllEnvs());

  it("posts to a domain world's own register service", () => {
    vi.stubEnv('VITE_REGISTER_API', 'https://somewhere.example/api/register');
    expect(registerApiUrl(listed)).toBe('https://register.ignies.net/api/register');
  });

  it('has nowhere to post for a world that published only an address', () => {
    vi.stubEnv('VITE_REGISTER_API', '');
    expect(registerApiUrl(addressed)).toBe('');
  });

  it('falls back to the build for a world with no domain', () => {
    vi.stubEnv('VITE_REGISTER_API', '/api/register');
    expect(registerApiUrl(addressed)).toBe('/api/register');
  });
});

describe('shopApiUrl', () => {
  it("asks a domain world's own service", () => {
    expect(shopApiUrl(listed)).toBe('https://api.ignies.net/api');
  });

  it('falls back to the relative path for a world with no domain', () => {
    expect(shopApiUrl(addressed)).toBe('/api');
  });
});
