import { afterEach, describe, expect, it } from 'vitest';
import { ServerAccounts } from './serverAccounts';
import { URL_PROFILE_ID } from './serverConfig';

const ONE = 'list:one.net';
const TWO = 'list:two.net';

afterEach(() => {
  for (const id of [ONE, TWO, URL_PROFILE_ID]) ServerAccounts.forget(id);
});

/** An account with a name on it, since a blank row is not a login. */
function named(worldId: string, username: string, password = 'pw'): string {
  const id = ServerAccounts.add(worldId);

  ServerAccounts.update(worldId, id, { username, password });

  return id;
}

describe('ServerAccounts', () => {
  it('reads a world with no account as a blank one', () => {
    expect(ServerAccounts.of(ONE)).toMatchObject({ username: '', password: '' });
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

  it('keeps the name but forgets the password once "remember" is off', () => {
    const id = named(ONE, 'main', 'secret');

    ServerAccounts.update(ONE, id, { remember: false });

    expect(ServerAccounts.of(ONE)).toMatchObject({
      username: 'main',
      password: '',
      remember: false,
    });
  });

  it('clamps what the login packet cannot carry', () => {
    named(ONE, 'waylongerthanten', 'alsowaytoolong');

    expect(ServerAccounts.of(ONE).username).toHaveLength(10);
    expect(ServerAccounts.of(ONE).password).toHaveLength(10);
  });

  it('refuses the URL profile, which is gone next launch anyway', () => {
    expect(ServerAccounts.add(URL_PROFILE_ID)).toBe('');
    expect(ServerAccounts.list(URL_PROFILE_ID)).toEqual([]);
  });

  it('records a login under the account of that name, not a second one', () => {
    const id = named(ONE, 'main', 'old');

    ServerAccounts.record(ONE, {
      username: 'main',
      password: 'new',
      remember: true,
    });

    expect(ServerAccounts.list(ONE)).toHaveLength(1);
    expect(ServerAccounts.of(ONE)).toMatchObject({
      id,
      password: 'new',
    });
    expect(ServerAccounts.of(ONE).lastLoginAt).toBeGreaterThan(0);
  });

  it('records a login with a new name as another account of that world', () => {
    named(ONE, 'main');

    ServerAccounts.record(ONE, {
      username: 'mule',
      password: 'pw',
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
      password: 'pw',
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
