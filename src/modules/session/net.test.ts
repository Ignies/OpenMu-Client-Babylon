import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/** The world's `retryLoginWhenConnected` and `loginTokens`, set per test. */
const world = vi.hoisted(() => ({ retryLogin: false, tokens: false }));
vi.mock('../servers/serverManifest', async importOriginal => ({
  ...(await importOriginal<typeof import('../servers/serverManifest')>()),
  serverSetting: (key: string) => (key === 'retryLoginWhenConnected' ? world.retryLogin : false),
  serverOffersLoginTokens: () => world.tokens,
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { Session } = await import('./state');
const { EventBus } = await import('@/core/eventBus');
const { LoginResponsePacket, LoginResponseLoginResultEnum, LoginTokenAnswerPacket } = await import(
  '@versions/shared/packets/ServerToClientPackets'
);
const { ServerAccounts, tokenToText } = await import('../servers/serverAccounts');
const { ServerConfig } = await import('../servers/serverConfig');
const { parseServerLine } = await import('../servers/serverList');
const { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } = await import('@/controllers/fidelity');
const { AppState, UIState } = await import('@/controllers/interface/uiState');
const { t } = await import('@/i18n');

installNet();

function refused(result = LoginResponseLoginResultEnum.AccountAlreadyConnected): DataView {
  const p = LoginResponsePacket.createPacket();
  p.Success = result;
  return p.buffer;
}

/** The server's E7 04 with this token. */
function tokenAnswer(token: Uint8Array): DataView {
  const p = LoginTokenAnswerPacket.createPacket();
  p.setToken(token, token.length);
  return p.buffer;
}

/** Code and sub-code of each packet the client sent. */
const sentCodes = (send: { mock: { calls: unknown[][] } }) =>
  send.mock.calls.map(([view]) => {
    const v = view as DataView;
    return [v.getUint8(0), v.getUint8(2), v.getUint8(3)];
  });

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

describe('login tokens', () => {
  const listed = parseServerLine('[S6EP3:Tokens:A world:en](tokens.example)');
  if (!listed) throw new Error('world line');
  const TOKEN = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
  const NEXT = Uint8Array.from({ length: 32 }, (_, i) => 100 + i);

  beforeEach(() => {
    world.tokens = true;
    ServerConfig.setListed([listed]);
    ServerConfig.select(listed.id);
    Session.loadAccount(listed.id, true);
    Session.username = 'hero';
    Session.password = '';
    Session.rememberLogin = true;
    setFidelityChoice(FIDELITY_DEFAULT, {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ServerAccounts.forget(listed.id);
    ServerConfig.setListed([]);
    setFidelityChoice(FIDELITY_DEFAULT, {});
    world.tokens = false;
  });

  it('asks for a token after a password login and keeps it in place of the password', () => {
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
    Session.password = 'secret';

    Session.submitLogin();
    EventBus.emit('LoginResponse', refused(LoginResponseLoginResultEnum.Okay));
    EventBus.emit('LoginTokenAnswer', tokenAnswer(TOKEN));

    expect(sentCodes(send)).toEqual([[0xc3, 0xf1, 0x01], [0xc1, 0xe7, 0x03]]);
    expect(ServerAccounts.tokenOf(listed.id, 'hero')).toBe(tokenToText(TOKEN));
    expect(JSON.stringify(ServerAccounts.list(listed.id))).not.toContain('secret');
  });

  it('asks for none on Classic, on a world without tokens, or with "remember" off', () => {
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
    const passwordLogin = () => {
      Session.loginRequest('hero', 'secret');
      EventBus.emit('LoginResponse', refused(LoginResponseLoginResultEnum.Okay));
    };

    setFidelityChoice(FIDELITY_CLASSIC, {});
    passwordLogin();
    setFidelityChoice(FIDELITY_DEFAULT, {});
    world.tokens = false;
    passwordLogin();
    world.tokens = true;
    Session.rememberLogin = false;
    passwordLogin();

    expect(sentCodes(send).filter(([, code]) => code === 0xe7)).toEqual([]);
  });

  it('sends the saved token with the password field empty, and keeps the token that replaces it', () => {
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
    ServerAccounts.record(listed.id, { username: 'hero', remember: true });
    ServerAccounts.saveToken(listed.id, 'hero', tokenToText(TOKEN));

    expect(Session.canSubmitLogin).toBe(true);
    Session.submitLogin();
    EventBus.emit('LoginResponse', refused(LoginResponseLoginResultEnum.Okay));
    EventBus.emit('LoginTokenAnswer', tokenAnswer(NEXT));

    const login = send.mock.calls[0][0] as DataView;
    expect([login.getUint8(0), login.getUint8(2), login.getUint8(3)]).toEqual([0xc3, 0xe7, 0x05]);
    expect(new Uint8Array(login.buffer, login.byteOffset + 14, 32)).toEqual(TOKEN);
    // A token login asks for no second token: the server sends the replacement by itself.
    expect(sentCodes(send)).toHaveLength(1);
    expect(ServerAccounts.tokenOf(listed.id, 'hero')).toBe(tokenToText(NEXT));
  });

  it('types the password on Classic, the saved token unused', () => {
    ServerAccounts.record(listed.id, { username: 'hero', remember: true });
    ServerAccounts.saveToken(listed.id, 'hero', tokenToText(TOKEN));
    setFidelityChoice(FIDELITY_CLASSIC, {});

    expect(Session.savedToken).toBeNull();
    expect(Session.canSubmitLogin).toBe(false);
  });

  it('drops a refused token and asks for the password, the name still filled', () => {
    vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
    ServerAccounts.record(listed.id, { username: 'hero', remember: true });
    ServerAccounts.saveToken(listed.id, 'hero', tokenToText(TOKEN));

    Session.submitLogin();
    EventBus.emit('LoginResponse', refused(LoginResponseLoginResultEnum.InvalidPassword));

    expect(ServerAccounts.tokenOf(listed.id, 'hero')).toBe('');
    expect(Session.loginError).toBe(t('login.tokenRefused'));
    expect(AppState.uiState).toBe(UIState.Login);
    expect(Session.username).toBe('hero');
    expect(Session.canSubmitLogin).toBe(false);
  });

  it('logs in again with the token after a drop when the session typed no password', () => {
    const send = vi.spyOn(Session, 'sendToGS').mockImplementation(() => undefined);
    ServerAccounts.record(listed.id, { username: 'hero', remember: true });
    ServerAccounts.saveToken(listed.id, 'hero', tokenToText(TOKEN));
    Session.submitLogin();
    EventBus.emit('LoginResponse', refused(LoginResponseLoginResultEnum.Okay));
    EventBus.emit('LoginTokenAnswer', tokenAnswer(NEXT));

    expect(Session.canResumeLogin).toBe(true);
    Session.resumeLogin();

    const again = send.mock.calls.at(-1)?.[0] as DataView;
    expect([again.getUint8(0), again.getUint8(2), again.getUint8(3)]).toEqual([0xc3, 0xe7, 0x05]);
    expect(new Uint8Array(again.buffer, again.byteOffset + 14, 32)).toEqual(NEXT);
  });
});
