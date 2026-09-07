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

  it('works a world published as its domain out to its services', () => {
    expect(
      parseServerLine(
        '[S6EP3:Ignies:Season 6 Episode 3, played in the browser:es](ignies.net)'
      )
    ).toMatchObject({
      id: 'list:ignies.net',
      name: 'Ignies',
      domain: 'ignies.net',
      // The proxy by convention, and the connect server as that proxy reaches
      // it: the world never had to say either.
      wsUrl: 'wss://ws.ignies.net',
      csHost: '127.0.0.1',
      csPort: 44405,
    });
  });

  it('lets a domain name a proxy that is not the conventional one', () => {
    expect(
      parseServerLine('[Ignies:A world:es](ignies.net@wss://gate.ignies.net)')
    ).toMatchObject({
      domain: 'ignies.net',
      wsUrl: 'wss://gate.ignies.net',
    });
  });

  // An address is not a domain: there are no labels to hang `ws.` off, so the
  // short form cannot mean anything and the line is dropped rather than
  // turned into a world that dials nowhere.
  it('drops an address published without a port', () => {
    expect(
      parseServerLine('[S6EP3:Test:A world:en](1.2.3.4@ws://1.2.3.4)')
    ).toBeNull();
    expect(parseServerLine('[S6EP3:Test:A world:en](localhost)')).toBeNull();
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

describe('published game server names', () => {
  const list = (...lines: string[]) => parseServerList(lines.join('\n'));

  it('reads the game servers and channels written under a world', () => {
    const [world] = list(
      '[S6EP3:Ignies:A world:en](ignies.net)',
      '- 0: Valhalla',
      '  - 0: Peaceful',
      '  - 1: Hard',
      '- 1: Elysium',
      '  - 0: PvP'
    );

    expect(world.servers).toEqual([
      {
        id: 0,
        name: 'Valhalla',
        channels: [
          { id: 0, name: 'Peaceful' },
          { id: 1, name: 'Hard' },
        ],
      },
      { id: 1, name: 'Elysium', channels: [{ id: 0, name: 'PvP' }] },
    ]);
  });

  // One group and several channels: there is nothing to call the group, and
  // the world should not have to invent a name to reach the rows under it.
  it('lets a game server open a group without naming it', () => {
    const [world] = list(
      '[Ignies:A world:en](ignies.net)',
      '- 0:',
      '  - 1: Hard'
    );

    expect(world.servers).toEqual([
      { id: 0, name: '', channels: [{ id: 1, name: 'Hard' }] },
    ]);
  });

  it('leaves a world that named nothing without names', () => {
    expect(list('[Ignies:A world:en](ignies.net)')[0].servers).toBeUndefined();
  });

  // The rule that keeps this file's own examples out of the picker: a name
  // line only counts while the run of them still touches its own entry.
  it('stops at the first line that is not a name', () => {
    const [world] = list(
      '[Ignies:A world:en](ignies.net)',
      '- 0: Valhalla',
      '',
      '- 1: Elysium'
    );

    expect(world.servers).toEqual([{ id: 0, name: 'Valhalla', channels: [] }]);
  });

  it('drops a channel written before any game server', () => {
    const [world] = list('[Ignies:A world:en](ignies.net)', '  - 0: Peaceful');

    expect(world.servers).toBeUndefined();
  });

  it('refuses an id no ServerId could carry', () => {
    const [world] = list('[Ignies:A world:en](ignies.net)', '- 300: Valhalla');

    expect(world.servers).toBeUndefined();
  });

  it('keeps names with the world they were written under', () => {
    const [first, second] = list(
      '[Ignies:A world:en](ignies.net)',
      '- 0: Valhalla',
      '[Other:A world:en](other.example)',
      '- 0: Elysium'
    );

    expect(first.servers?.[0].name).toBe('Valhalla');
    expect(second.servers?.[0].name).toBe('Elysium');
  });
});

// The file the client fetches at launch. A line that stops parsing takes the
// whole list off the start screen, and nothing else in the build would say so.
describe('serverlist.md', () => {
  const published = parseServerList(readFileSync('serverlist.md', 'utf8'));

  it('publishes at least one world', () => {
    expect(published.length).toBeGreaterThan(0);
  });

  // The prose around the entries shows the syntax, which means it is written
  // in the syntax: nothing in it may end up on a real world.
  it('gives no world a name its own entry did not carry', () => {
    for (const world of published) {
      for (const server of world.servers ?? []) {
        expect(`${world.name}/${server.name}`).not.toContain('Valhalla');
      }
    }
  });
});
