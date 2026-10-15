import { describe, expect, it, vi } from 'vitest';
import { matchesSearch, type ServerProfile } from './serverConfig';

const world = (patch: Partial<ServerProfile> = {}): ServerProfile => ({
  id: 'list:ignies.net',
  name: 'Ignies',
  csHost: '127.0.0.1',
  csPort: 44405,
  wsUrl: 'wss://ws.ignies.net',
  gsAddress: 'auto',
  listed: true,
  domain: 'ignies.net',
  description: 'Season 6 Episode 3, played in the browser',
  language: 'es',
  version: 'S6EP3',
  ...patch,
});

describe('matchesSearch', () => {
  it('keeps every world when nothing was typed', () => {
    expect(matchesSearch(world(), '')).toBe(true);
    expect(matchesSearch(world(), '   ')).toBe(true);
  });

  it('matches the name, whatever the case', () => {
    expect(matchesSearch(world(), 'IGN')).toBe(true);
    expect(matchesSearch(world(), 'lorencia')).toBe(false);
  });

  it('matches what the world says about itself, not only its name', () => {
    expect(matchesSearch(world(), 'episode 3')).toBe(true);
    expect(matchesSearch(world(), 's6ep3')).toBe(true);
    expect(matchesSearch(world(), 'es')).toBe(true);
    expect(matchesSearch(world(), 'ignies.net')).toBe(true);
  });

  it('matches a game server or channel the list named', () => {
    const named = world({
      servers: [
        { id: 0, name: 'Valhalla', channels: [{ id: 0, name: 'Peaceful' }] },
      ],
    });

    expect(matchesSearch(named, 'valhalla')).toBe(true);
    expect(matchesSearch(named, 'peaceful')).toBe(true);
    expect(matchesSearch(world(), 'valhalla')).toBe(false);
  });

  it('narrows with every word rather than widening', () => {
    expect(matchesSearch(world(), 'ignies browser')).toBe(true);
    expect(matchesSearch(world(), 'ignies lorencia')).toBe(false);
  });

  it('searches a saved profile by the address it was typed with', () => {
    const saved = world({
      id: 'local',
      name: 'Local (OpenMU)',
      listed: false,
      domain: undefined,
      description: undefined,
      language: undefined,
      version: undefined,
    });

    expect(matchesSearch(saved, '127.0.0.1')).toBe(true);
    expect(matchesSearch(saved, '44405')).toBe(true);
    expect(matchesSearch(saved, 'openmu')).toBe(true);
  });
});

describe('the ?cs= override', () => {
  it('builds its profile when no profile is saved or seeded', async () => {
    vi.resetModules();
    vi.stubGlobal('location', { search: '?cs=10.0.0.5:44405', hostname: 'play.example.com', protocol: 'https:' });
    try {
      const { ServerConfig } = await import('./serverConfig');

      expect(ServerConfig.urlProfile?.csHost).toBe('10.0.0.5');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('a page served from a LAN address', () => {
  it('seeds the local world on the proxy of the page host', async () => {
    vi.resetModules();
    vi.stubGlobal('location', { search: '', hostname: '192.168.1.20', protocol: 'http:' });
    try {
      const { ServerConfig } = await import('./serverConfig');
      const { WS_PORT } = await import('./defaults');

      expect(ServerConfig.profiles.map(p => p.wsUrl)).toEqual([`ws://192.168.1.20:${WS_PORT}`]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
