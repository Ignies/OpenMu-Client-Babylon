import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { intercept, runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { Session } = await import('./state');
const { SessionExit } = await import('./sessionExit');
const { EventBus } = await import('@/core/eventBus');
const { ServerListResponsePacket } = await import('@versions/shared/packets/ConnectServerPackets');
const { GameServerEnteredPacket } = await import('@versions/shared/packets/ServerToClientPackets');
const { Servers } = await import('../servers');
const { checkDirectLogin } = await import('../servers/directLogin');
const { ServerConfig } = await import('../servers/serverConfig');
const { AppState, UIState } = await import('@/controllers/interface/uiState');

installNet();

/** The connect server's list with these ids. */
function serverList(ids: number[]): DataView {
  const p = ServerListResponsePacket.createPacket(7 + 4 * ids.length);
  p.ServerCount = ids.length;
  ids.forEach((id, i) => p.buffer.setUint16(7 + 4 * i, id, true));
  return p.buffer;
}

/** Every page the app showed while `fn` ran. */
function screensDuring(fn: () => void): number[] {
  const seen: number[] = [];
  const stop = intercept(AppState, 'uiState', change => {
    seen.push(change.newValue);
    return change;
  });
  fn();
  stop();
  return seen;
}

describe('direct login off (no server.json beside the client)', () => {
  it('goes to the server list as before', () => {
    vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => undefined);
    Session.playOnline();
    expect(AppState.uiState).toBe(UIState.Servers);
    vi.restoreAllMocks();
  });
});

describe('direct login on', () => {
  beforeAll(async () => {
    await checkDirectLogin(async file =>
      file === 'server.json'
        ? '{"version":1,"settings":{},"directLogin":true}'
        : '[S6EP3:My MU:A world:en](example.com)\n'
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Session.gsSocket = undefined;
  });

  it('opens the login, never the server list, and waits there for the game server', () => {
    vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => undefined);
    const screens = screensDuring(() => Session.playOnline());
    expect(screens).not.toContain(UIState.Servers);
    expect(AppState.uiState).toBe(UIState.Login);
    expect(Session.loginProcessing).toBe(true);
  });

  it('asks for the list on every connect and takes its first channel', () => {
    vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => undefined);
    const ask = vi.spyOn(Servers, 'updateServerListRequest').mockImplementation(() => undefined);
    const pick = vi.spyOn(Servers, 'getConnectionInfoRequest').mockImplementation(() => undefined);
    Session.playOnline();

    EventBus.emit('Hello', new DataView(new ArrayBuffer(4)));
    EventBus.emit('Hello', new DataView(new ArrayBuffer(4)));
    expect(ask).toHaveBeenCalledTimes(2);

    EventBus.emit('ServerListResponse', serverList([0x101, 0x001, 0x000]));
    expect(pick).toHaveBeenCalledWith(0);
    expect(Servers.selectedServer).toEqual({ name: 'Server 1', channel: 1, channelName: undefined });
  });

  it('leaves the list alone once a game server is dialled', () => {
    const pick = vi.spyOn(Servers, 'getConnectionInfoRequest').mockImplementation(() => undefined);
    Session.gsSocket = {} as WebSocket;
    EventBus.emit('ServerListResponse', serverList([0]));
    expect(pick).not.toHaveBeenCalled();
  });

  it('lets the player type once the game server greets', () => {
    runInAction(() => {
      Session.loginProcessing = true;
    });
    EventBus.emit('GameServerEntered', GameServerEnteredPacket.createPacket().buffer);
    expect(AppState.uiState).toBe(UIState.Login);
    expect(Session.loginProcessing).toBe(false);
  });

  it('comes back to the login on Cancel, logout and a lost connection', () => {
    vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => undefined);
    vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
    const screens = screensDuring(() => {
      Session.cancelLogin();
      SessionExit.onResponse(2);
      const socket = {} as WebSocket;
      Session.gsSocket = socket;
      Session.onSocketLost(socket);
    });
    expect(screens).not.toContain(UIState.Servers);
    expect(AppState.uiState).toBe(UIState.Login);
  });

  it('dials the connect server again when it drops while the login waits', () => {
    const dial = vi.spyOn(Session, 'connectToConnectServer').mockImplementation(() => undefined);
    Session.playOnline();
    const socket = {} as WebSocket;
    Session.csSocket = socket;
    Session.onSocketLost(socket);
    expect(dial).toHaveBeenCalledTimes(2);
    expect(AppState.uiState).toBe(UIState.Login);
  });

  it('keeps the world the only one', () => {
    expect(ServerConfig.all.map(w => w.id)).toEqual(['list:example.com']);
  });
});
