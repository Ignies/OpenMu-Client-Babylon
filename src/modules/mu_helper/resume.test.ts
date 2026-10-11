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
const { SessionExit } = await import('../session/sessionExit');
const { Ecs } = await import('@/ecs/current');
const { AppState, UIState } = await import('@/controllers/interface/uiState');
const { MuHelperStatusChangeRequestPacket } = await import('@versions/shared/packets/ClientToServerPackets');

installResume();

/** The hero in the world, outside a safe zone. */
runInAction(() => {
  Ecs.world = {
    playerEntity: { attributeSystem: { isAboveZero: () => false } },
    removeHero: () => {},
  } as unknown as typeof Ecs.world;
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

// The original's helper ends with the session: the menu's Select Server and Switch Character stop
// it (NewUICustomMessageBox.cpp:2374, 2406), and a lost connection tears the game down
// (ReceiveLogOut case 2, WSclient.cpp:985-1013) with the server's helper gone with it.
describe('the MU Helper when the session ends', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    runInAction(() => {
      AppState.uiState = UIState.World;
    });
  });

  it('stops on Switch Character and Select Server, and keeps running through a warp', () => {
    for (const page of [UIState.Characters, UIState.Servers]) {
      runInAction(() => {
        AppState.uiState = UIState.World;
      });
      MuHelper.setMuHelperStatus(true, 0);
      runInAction(() => {
        AppState.uiState = UIState.LoadingWorld;
      });
      expect(MuHelper.active).toBe(true);
      runInAction(() => {
        AppState.uiState = page;
      });
      expect(MuHelper.active, UIState[page]).toBe(false);
    }
  });

  it('stops when the connection drops and nothing resumes it', () => {
    vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => undefined);
    runInAction(() => {
      AppState.uiState = UIState.World;
    });
    MuHelper.setMuHelperStatus(true, 0);
    const socket = {} as WebSocket;
    Session.gsSocket = socket;
    Session.resumeHook = () => false;

    Session.onSocketLost(socket);

    expect(MuHelper.active).toBe(false);
    Session.resumeHook = null;
  });
});

// CSystemMenuMsgBox's Select Server and Switch Character send `TriggerStop` before the LogOut
// when the helper runs (NewUICustomMessageBox.cpp:2374, 2406).
describe('leaving through the system menu', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** The packets the exit sends, as code/subcode and their first data byte. */
  function exitPackets(kind: 'servers' | 'characters', helperOn: boolean): string[] {
    vi.useFakeTimers();
    runInAction(() => {
      AppState.uiState = UIState.World;
    });
    MuHelper.setMuHelperStatus(helperOn, 0);
    const sent: string[] = [];
    vi.spyOn(Session, 'sendToGS').mockImplementation(view => {
      sent.push([view.getUint8(2), view.getUint8(3), view.getUint8(4)].map(b => b.toString(16)).join(' '));
    });
    SessionExit.request(kind);
    SessionExit.onResponse(kind === 'servers' ? 2 : 1);
    return sent;
  }

  it('asks the server to stop a running helper, then logs out', () => {
    vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => undefined);
    // BF 51 with PauseStatus 1 (what the helper's own off switch sends), then F1 02 with the type.
    expect(exitPackets('servers', true)).toEqual(['bf 51 1', 'f1 2 2']);
    expect(exitPackets('characters', true)).toEqual(['bf 51 1', 'f1 2 1']);
  });

  it('sends only the LogOut when the helper is off', () => {
    vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => undefined);
    expect(exitPackets('servers', false)).toEqual(['f1 2 2']);
    expect(exitPackets('characters', false)).toEqual(['f1 2 1']);
  });
});
