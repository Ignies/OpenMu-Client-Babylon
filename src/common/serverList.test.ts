import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseServerLine, parseServerList } from './serverList';

describe('parseServerLine', () => {
  it('reads a published world with a proxy of its own', () => {
    expect(
      parseServerLine(
        '[S6EP3:Ignies:Season 6 Episode 3, played in the browser:es](127.0.0.1:44405@wss://ws.ignies.net:443)'
      )
    ).toMatchObject({
      version: 'S6EP3',
      name: 'Ignies',
      description: 'Season 6 Episode 3, played in the browser',
      language: 'es',
      csHost: '127.0.0.1',
      csPort: 44405,
      wsUrl: 'wss://ws.ignies.net:443',
      listed: true,
    });
  });

  it('drops a target that names no port', () => {
    expect(
      parseServerLine('[S6EP3:Test:A world:en](1.2.3.4@ws://1.2.3.4)')
    ).toBeNull();
  });

  it('drops a proxy that is not a bare ws address', () => {
    const world = parseServerLine(
      '[Test:A world:en](1.2.3.4:44405@wss://evil.example/?host=elsewhere)'
    );

    // Not dropped outright: the world is still addressable, and only the proxy
    // field is refused - the client's own is used instead.
    expect(world?.wsUrl).not.toContain('evil.example');
  });
});

// The file the client fetches at launch. A line that stops parsing takes the
// whole list off the start screen, and nothing else in the build would say so.
describe('serverlist.md', () => {
  it('publishes at least one world', () => {
    expect(parseServerList(readFileSync('serverlist.md', 'utf8')).length)
      .toBeGreaterThan(0);
  });
});
