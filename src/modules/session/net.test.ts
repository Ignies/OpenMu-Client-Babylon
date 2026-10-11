import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/** The world's `retryLoginWhenConnected`, set per test. */
const world = vi.hoisted(() => ({ retryLogin: false }));
vi.mock('../servers/serverManifest', async importOriginal => ({
  ...(await importOriginal<typeof import('../servers/serverManifest')>()),
  serverSetting: (key: string) => (key === 'retryLoginWhenConnected' ? world.retryLogin : false),
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { Session } = await import('./state');
const { EventBus } = await import('@/core/eventBus');
const { LoginResponsePacket, LoginResponseLoginResultEnum } = await import(
  '@versions/shared/packets/ServerToClientPackets'
);

installNet();

function refused(): DataView {
  const p = LoginResponsePacket.createPacket();
  p.Success = LoginResponseLoginResultEnum.AccountAlreadyConnected;
  return p.buffer;
}

describe('LoginResponse: account already connected', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the refusal and sends nothing more, as the original, by default', () => {
    world.retryLogin = false;
    vi.useFakeTimers();
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);

    Session.loginRequest('hero', 'secret');
    EventBus.emit('LoginResponse', refused());
    vi.advanceTimersByTime(30_000);

    expect(send).toHaveBeenCalledTimes(1);
    expect(Session.loginProcessing).toBe(false);
    expect(Session.loginError).toContain('AccountAlreadyConnected');
  });

  it('sends the same login again a few times where the server asks for it', () => {
    world.retryLogin = true;
    vi.useFakeTimers();
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);

    Session.loginRequest('hero', 'secret');
    for (let i = 0; i < 3; i++) {
      EventBus.emit('LoginResponse', refused());
      expect(Session.loginProcessing).toBe(true);
      vi.advanceTimersByTime(2500);
    }
    expect(send).toHaveBeenCalledTimes(4);

    // Out of retries: the refusal stands.
    EventBus.emit('LoginResponse', refused());
    vi.advanceTimersByTime(30_000);
    expect(send).toHaveBeenCalledTimes(4);
    expect(Session.loginProcessing).toBe(false);
    expect(Session.loginError).toContain('AccountAlreadyConnected');
  });

  it('drops a pending retry when the player leaves the login', () => {
    world.retryLogin = true;
    vi.useFakeTimers();
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);

    Session.loginRequest('hero', 'secret');
    EventBus.emit('LoginResponse', refused());
    Session.disconnectFromGameServer();
    vi.advanceTimersByTime(30_000);

    expect(send).toHaveBeenCalledTimes(1);
  });
});
