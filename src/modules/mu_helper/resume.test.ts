import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.stubGlobal('location', { search: '', hostname: 'localhost', href: 'http://localhost/' });

/** The world's `muHelperAfterReconnect`, set per test. */
const world = vi.hoisted(() => ({ restart: false }));
vi.mock('../servers/serverManifest', async importOriginal => ({
  ...(await importOriginal<typeof import('../servers/serverManifest')>()),
  serverSetting: (key: string) => (key === 'muHelperAfterReconnect' ? world.restart : false),
}));
vi.mock('../module', async importOriginal => ({
  ...(await importOriginal<typeof import('../module')>()),
  moduleOn: () => true,
}));

const { MuHelper } = await import('./state');
const { installResume } = await import('./resume');
const { Session } = await import('../session');
const { SessionResume } = await import('../session/sessionResume');
const { Ecs } = await import('@/ecs/current');
const { MuHelperStatusChangeRequestPacket } = await import('@versions/shared/packets/ClientToServerPackets');

installResume();

/** The hero in the world, outside a safe zone. */
runInAction(() => {
  Ecs.world = { playerEntity: { attributeSystem: { isAboveZero: () => false } } } as unknown as typeof Ecs.world;
});

/** A socket drop in the world and a resume that gets the character back; the start requests sent. */
function dropAndResume(): boolean[] {
  vi.useFakeTimers();
  const sent: boolean[] = [];
  vi.spyOn(Session, 'sendToGS').mockImplementation(view => {
    sent.push(new MuHelperStatusChangeRequestPacket(view).PauseStatus);
  });
  vi.spyOn(Session, 'connectToGameServer').mockImplementation(() => undefined);
  Session.username = 'hero';
  Session.password = 'secret';
  Session.lastGameServer = { host: 'h', port: 1, fallbackHost: null };
  SessionResume.remember('Hero');

  expect(SessionResume.begin()).toBe(true);
  // The old session took the server's helper with it.
  expect(MuHelper.active).toBe(false);
  vi.advanceTimersByTime(1000);
  SessionResume.finish();
  vi.advanceTimersByTime(5000);
  return sent;
}

describe('the MU Helper across an automatic reconnect', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    SessionResume.forget();
  });

  it('stays off after the resume by default', () => {
    world.restart = false;
    MuHelper.setMuHelperStatus(true, 0);
    expect(dropAndResume()).toEqual([]);
  });

  it('asks the server to start it again where the world allows it', () => {
    world.restart = true;
    MuHelper.setMuHelperStatus(true, 0);
    expect(dropAndResume()).toEqual([false]);
  });

  it('starts nothing that was not running when the connection dropped', () => {
    world.restart = true;
    MuHelper.setMuHelperStatus(false, 0);
    expect(dropAndResume()).toEqual([]);
  });
});
