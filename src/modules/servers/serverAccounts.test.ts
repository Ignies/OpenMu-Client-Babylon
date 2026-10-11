import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServerAccounts, ServerAccountsStore, tokenFromText, tokenToText } from './serverAccounts';
import { ServerConfig, URL_PROFILE_ID } from './serverConfig';
import { parseServerLine } from './serverList';

const ONE = 'list:one.net';
const TWO = 'list:two.net';
const NUMBERED = 'list:7';

afterEach(() => {
  for (const id of [ONE, TWO, NUMBERED, URL_PROFILE_ID])
    ServerAccounts.forget(id);
});

/** A token as the server hands it out, as stored. */
const TOKEN = tokenToText(Uint8Array.from({ length: 32 }, (_, i) => i));

/** An account with a name on it, since a blank row is not a login. */
function named(worldId: string, username: string, token = TOKEN): string {
  const id = ServerAccounts.add(worldId);

  ServerAccounts.update(worldId, id, { username, token });

  return id;
}

/** A localStorage holding these entries, for a store loaded from it. */
function storage(entries: Record<string, unknown>): Map<string, string> {
  const data = new Map(Object.entries(entries).map(([k, v]) => [k, JSON.stringify(v)]));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
  return data;
}

describe('ServerAccounts', () => {
  it('moves a world to the id it starts publishing, accounts and selection with it', () => {
    const listed = (line: string) =>
      ServerConfig.setListed([line].flatMap(l => parseServerLine(l) ?? []));

    named(ONE, 'main');
    listed('[One:A world:en](one.net)');
    ServerConfig.select(ONE);
    listed('[7:One:A world:en](one.net)');

    expect(ServerConfig.activeId).toBe(NUMBERED);
    expect(ServerAccounts.of(NUMBERED).username).toBe('main');
    expect(ServerAccounts.has(ONE)).toBe(false);
    ServerConfig.setListed([]);
  });

  it('reads a world with no account as a blank one', () => {
    expect(ServerAccounts.of(ONE)).toMatchObject({ username: '', token: '' });
    expect(ServerAccounts.list(ONE)).toEqual([]);
    expect(ServerAccounts.has(ONE)).toBe(false);
  });

  it('keeps several accounts on one world, with one of them chosen', () => {
    const main = named(ONE, 'main');
    const mule = named(ONE, 'mule');

    expect(ServerAccounts.list(ONE).map(a => a.username)).toEqual([
      'main',
      'mule',
    ]);
    // Adding selects what was added, which is the row now being typed into.
    expect(ServerAccounts.activeId(ONE)).toBe(mule);

    ServerAccounts.select(ONE, main);
    expect(ServerAccounts.of(ONE).username).toBe('main');
  });

  it('keeps one world of accounts apart from the next', () => {
    named(ONE, 'alpha');
    named(TWO, 'beta');

    expect(ServerAccounts.of(ONE).username).toBe('alpha');
    expect(ServerAccounts.of(TWO).username).toBe('beta');
    expect(ServerAccounts.count).toBe(2);
  });

  it('keeps the name but forgets the token once "remember" is off', () => {
    const id = named(ONE, 'main');

    ServerAccounts.update(ONE, id, { remember: false });

    expect(ServerAccounts.of(ONE)).toMatchObject({
      username: 'main',
      token: '',
      remember: false,
    });
  });

  it('clamps the name to what the login packet carries, and keeps only a well-formed token', () => {
    named(ONE, 'waylongerthanten', 'not a token');

    expect(ServerAccounts.of(ONE).username).toHaveLength(10);
    expect(ServerAccounts.of(ONE).token).toBe('');
  });

  it('turns a token into stored text and back', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));

    expect(tokenFromText(tokenToText(bytes))).toEqual(bytes);
    expect(tokenFromText('')).toBeNull();
    expect(tokenFromText('short')).toBeNull();
  });

  it('keeps a token for the account of that name, and drops it on request', () => {
    named(ONE, 'main', '');
    named(ONE, 'mule', '');

    ServerAccounts.saveToken(ONE, 'mule', TOKEN);
    expect(ServerAccounts.tokenOf(ONE, 'mule')).toBe(TOKEN);
    expect(ServerAccounts.tokenOf(ONE, 'main')).toBe('');

    ServerAccounts.saveToken(ONE, 'mule', '');
    expect(ServerAccounts.tokenOf(ONE, 'mule')).toBe('');
    // No row of that name: nothing is written.
    ServerAccounts.saveToken(ONE, 'nobody', TOKEN);
    expect(ServerAccounts.list(ONE)).toHaveLength(2);
  });

  it('drops the token of a row whose name is changed', () => {
    const id = named(ONE, 'main');

    ServerAccounts.update(ONE, id, { username: 'other' });

    expect(ServerAccounts.of(ONE)).toMatchObject({ username: 'other', token: '' });
  });

  it('refuses the URL profile, which is gone next launch anyway', () => {
    expect(ServerAccounts.add(URL_PROFILE_ID)).toBe('');
    expect(ServerAccounts.list(URL_PROFILE_ID)).toEqual([]);
  });

  it('records a login under the account of that name, not a second one, keeping its token', () => {
    const id = named(ONE, 'main');

    ServerAccounts.record(ONE, {
      username: 'main',
      remember: true,
    });

    expect(ServerAccounts.list(ONE)).toHaveLength(1);
    expect(ServerAccounts.of(ONE)).toMatchObject({
      id,
      token: TOKEN,
    });
    expect(ServerAccounts.of(ONE).lastLoginAt).toBeGreaterThan(0);
  });

  it('records a login with a new name as another account of that world', () => {
    named(ONE, 'main');

    ServerAccounts.record(ONE, {
      username: 'mule',
      remember: true,
    });

    expect(ServerAccounts.list(ONE).map(a => a.username)).toEqual([
      'main',
      'mule',
    ]);
    expect(ServerAccounts.of(ONE).username).toBe('mule');
  });

  it('writes nothing down for a login the player asked not to remember', () => {
    ServerAccounts.record(ONE, {
      username: 'guest',
      remember: false,
    });

    expect(ServerAccounts.list(ONE)).toEqual([]);
  });

  it('forgets one account, and falls back to what is left', () => {
    const main = named(ONE, 'main');

    named(ONE, 'mule');
    ServerAccounts.forget(ONE, ServerAccounts.activeId(ONE));

    expect(ServerAccounts.list(ONE).map(a => a.username)).toEqual(['main']);
    expect(ServerAccounts.activeId(ONE)).toBe(main);
  });
});

describe('passwords an older client saved', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('are wiped from the accounts on load, names kept', () => {
    const data = storage({
      mu_accounts: { [ONE]: { accounts: [{ id: 'a1', username: 'main', password: 'secret', remember: true }], activeId: 'a1' } },
    });

    const store = new ServerAccountsStore();

    expect(store.of(ONE)).toMatchObject({ username: 'main', token: '' });
    expect(data.get('mu_accounts')).not.toContain('secret');
    expect(data.get('mu_accounts')).not.toContain('password');
  });

  it('are wiped from the pre-rework blob on every load, its other keys left alone', () => {
    const data = storage({
      mu_accounts: {},
      _mu_key: { username: 'old', password: 'secret', rememberLogin: true, csIp: '10.0.0.1' },
    });

    new ServerAccountsStore();

    expect(JSON.parse(data.get('_mu_key') ?? '{}')).toEqual({ csIp: '10.0.0.1' });
  });
});
