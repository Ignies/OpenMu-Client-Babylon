import { describe, expect, it } from 'vitest';
import { parseServerLine } from './serverList';
import { registerUrl, shopApiUrl } from './serverServices';
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

describe('shopApiUrl', () => {
  it("asks a domain world's own service", () => {
    expect(shopApiUrl(listed)).toBe('https://api.ignies.net/api');
  });

  it('falls back to the relative path for a world with no domain', () => {
    expect(shopApiUrl(addressed)).toBe('/api');
  });
});
