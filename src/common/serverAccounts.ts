import { makeAutoObservable, runInAction } from 'mobx';
import { LocalStorage } from '../libs/localStorage';
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '../consts';
import { ServerConfig, URL_PROFILE_ID } from './serverConfig';

/**
 * The accounts this player uses on each world: a list per world, and which of
 * them the login window fills in.
 *
 * A client that plays any world cannot keep one login. The account that works
 * on one world means nothing on somebody's local OpenMU, and the pre-rework
 * client kept exactly one pair of credentials and handed it to whichever world
 * was entered next - so the book is keyed by profile id, the same key
 * `serverConfig.ts` selects and marks last-played with.
 *
 * More than one per world, because one per world is the same mistake a size
 * smaller: a main and a mule on the same server is the ordinary case in MU, and
 * a box that holds one of them turns the other into something retyped every
 * session.
 *
 * What it stores is what the original client stored: the name, the password,
 * and whether to keep them. It lives in this browser's localStorage in plain
 * text, exactly as the old single-account blob did - the accounts tab says so
 * out loud rather than implying a safety the client cannot provide. Turning
 * "remember" off on an entry stores neither field, which is also what the
 * original did.
 *
 * The URL profile is deliberately absent: it is a link somebody followed once
 * and is gone next launch, so an account saved against it would be orphaned.
 */

const ACCOUNTS_KEY = 'mu_accounts';

/** The pre-rework blob (store.ts `CONFIG_KEY`), read once to migrate. */
const LEGACY_KEY = '_mu_key';

/** What the tab has room for, and more mules than anyone runs from one browser. */
const MAX_PER_WORLD = 10;

export type ServerAccount = {
  /** Stable key within its world; `ServerConfig` ids are the world's key. */
  id: string;
  username: string;
  password: string;
  /** Off stores neither field, and is remembered so the box stays unticked. */
  remember: boolean;
  /** Epoch ms of the last login the server accepted, or 0 for never. */
  lastLoginAt: number;
};

type WorldAccounts = {
  accounts: ServerAccount[];
  /** The one the login window fills in, and the one Enter is about. */
  activeId: string;
};

export const EMPTY_ACCOUNT: ServerAccount = {
  id: '',
  username: '',
  password: '',
  remember: true,
  lastLoginAt: 0,
};

const NO_ACCOUNTS: WorldAccounts = { accounts: [], activeId: '' };

const clamp = (value: unknown, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : '';

let counter = 0;

function newId(): string {
  counter += 1;

  return `a${Date.now().toString(36)}${counter.toString(36)}`;
}

/**
 * What actually goes to disk. A row exists because the player put it there, so
 * "remember" is about the secret rather than about the row: off keeps the name
 * in the list and drops the password, and Delete is how a row goes away.
 */
function stored(account: ServerAccount): ServerAccount {
  return {
    id: account.id,
    username: clamp(account.username, MAX_USERNAME_LENGTH),
    password: account.remember
      ? clamp(account.password, MAX_PASSWORD_LENGTH)
      : '',
    remember: account.remember,
    lastLoginAt: account.lastLoginAt,
  };
}

/** A row that says nothing is dropped rather than kept as an empty line. */
const worthKeeping = (account: ServerAccount) =>
  !!account.username || !!account.password || account.lastLoginAt > 0;

function fromStorage(raw: unknown): ServerAccount | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Partial<ServerAccount>;
  const username = clamp(data.username, MAX_USERNAME_LENGTH);
  const at = Number(data.lastLoginAt);

  return stored({
    id: clamp(data.id, 40) || newId(),
    username,
    // A stored password with no name to go with it is not a login anyone can
    // use; half-typed fields on screen are the store's business, not disk's.
    password: username ? clamp(data.password, MAX_PASSWORD_LENGTH) : '',
    remember: data.remember !== false,
    lastLoginAt: Number.isFinite(at) && at > 0 ? at : 0,
  });
}

/**
 * One world's entry, from either shape it can be on disk: the list this store
 * writes, or the single account the first cut of it wrote.
 */
function worldFromStorage(raw: unknown): WorldAccounts | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as { accounts?: unknown; activeId?: unknown };
  const list = Array.isArray(data.accounts)
    ? data.accounts
    : // The one-account-per-world shape, read as a list of one.
      [raw];

  const accounts = list
    .map(fromStorage)
    .filter((a): a is ServerAccount => !!a && worthKeeping(a))
    .slice(0, MAX_PER_WORLD);

  if (!accounts.length) return null;

  const wanted = clamp(data.activeId, 40);

  return {
    accounts,
    activeId: accounts.some(a => a.id === wanted) ? wanted : accounts[0].id,
  };
}

/**
 * The one account the pre-rework client had, moved to the world it was most
 * likely typed on: the last one actually entered, or failing that the selected
 * one. Run once, and the legacy blob's credential keys are cleared afterwards
 * so the old global login cannot come back on a later launch.
 */
function migrateLegacy(): Record<string, WorldAccounts> {
  try {
    const raw = LocalStorage.load(LEGACY_KEY);

    if (!raw) return {};

    const data = JSON.parse(raw) as Record<string, unknown>;
    const account = fromStorage({
      username: data.username,
      password: data.password,
      remember: data.rememberLogin !== false,
    });

    delete data.username;
    delete data.password;
    delete data.rememberLogin;
    LocalStorage.save(LEGACY_KEY, JSON.stringify(data));

    if (!account || !worthKeeping(account)) return {};

    const id = ServerConfig.lastPlayedId || ServerConfig.activeId;

    return id ? { [id]: { accounts: [account], activeId: account.id } } : {};
  } catch {
    return {};
  }
}

function load(): Record<string, WorldAccounts> {
  const raw = LocalStorage.load(ACCOUNTS_KEY);

  if (!raw) return migrateLegacy();

  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const book: Record<string, WorldAccounts> = {};

    for (const [id, entry] of Object.entries(data)) {
      const world = worldFromStorage(entry);

      if (world) book[id] = world;
    }

    return book;
  } catch {
    return {};
  }
}

class ServerAccountsStore {
  private book: Record<string, WorldAccounts> = {};

  constructor() {
    this.book = load();
    makeAutoObservable(this);
  }

  /** Every account saved for that world, in the order they were added. */
  list(worldId: string): ServerAccount[] {
    return (this.book[worldId] ?? NO_ACCOUNTS).accounts;
  }

  /** Which one is chosen there; empty when the world has none. */
  activeId(worldId: string): string {
    return (this.book[worldId] ?? NO_ACCOUNTS).activeId;
  }

  /** The chosen account. Never null: a world with none reads as a blank one. */
  of(worldId: string): ServerAccount {
    const world = this.book[worldId];

    if (!world) return EMPTY_ACCOUNT;

    return world.accounts.find(a => a.id === world.activeId) ?? EMPTY_ACCOUNT;
  }

  /** Whether this world has a name saved, which is what the screens show. */
  has(worldId: string): boolean {
    return this.list(worldId).some(a => !!a.username);
  }

  /** Accounts saved across every world, for the tab's own summary. */
  get count(): number {
    return Object.values(this.book).reduce(
      (total, world) => total + world.accounts.filter(a => a.username).length,
      0
    );
  }

  /** Room for another on that world. */
  canAdd(worldId: string): boolean {
    return this.list(worldId).length < MAX_PER_WORLD;
  }

  /** A blank account on that world, selected. Returns its id, or empty. */
  add(worldId: string, patch: Partial<ServerAccount> = {}): string {
    if (!this.savable(worldId) || !this.canAdd(worldId)) return '';

    const account = stored({ ...EMPTY_ACCOUNT, ...patch, id: newId() });

    runInAction(() => {
      // Assigned first and read back after: MobX returns an observable copy of
      // what was stored, so pushing into the object handed to the assignment
      // would push into a plain array nothing is watching.
      if (!this.book[worldId]) this.book[worldId] = { accounts: [], activeId: '' };

      const world = this.book[worldId];

      world.accounts.push(account);
      world.activeId = account.id;
    });
    this.save();

    return account.id;
  }

  select(worldId: string, accountId: string): void {
    const world = this.book[worldId];

    if (!world?.accounts.some(a => a.id === accountId)) return;

    runInAction(() => {
      world.activeId = accountId;
    });
    this.save();
  }

  update(worldId: string, accountId: string, patch: Partial<ServerAccount>): void {
    if (!this.savable(worldId)) return;

    const world = this.book[worldId];
    const at = world?.accounts.findIndex(a => a.id === accountId) ?? -1;

    if (!world || at < 0) return;

    const next = stored({ ...world.accounts[at], ...patch, id: accountId });

    runInAction(() => {
      world.accounts[at] = next;
    });
    this.save();
  }

  forget(worldId: string, accountId?: string): void {
    const world = this.book[worldId];

    if (!world) return;

    runInAction(() => {
      if (accountId === undefined) {
        delete this.book[worldId];
        return;
      }

      world.accounts = world.accounts.filter(a => a.id !== accountId);

      if (!world.accounts.length) {
        delete this.book[worldId];
      } else if (world.activeId === accountId) {
        world.activeId = world.accounts[0].id;
      }
    });
    this.save();
  }

  /**
   * The login a server just accepted. It updates the account of that name when
   * the world already has one and adds it when it does not, so logging in with
   * a second account keeps the first rather than overwriting it.
   */
  record(
    worldId: string,
    login: { username: string; password: string; remember: boolean }
  ): void {
    if (!this.savable(worldId) || !login.username) return;

    const name = clamp(login.username, MAX_USERNAME_LENGTH);
    const existing = this.list(worldId).find(a => a.username === name);
    const patch = {
      username: name,
      password: login.password,
      remember: login.remember,
      lastLoginAt: Date.now(),
    };

    if (existing) {
      this.update(worldId, existing.id, patch);
      this.select(worldId, existing.id);
      return;
    }

    // "Remember" off is a request not to write this down at all, so the world
    // gets no new row for it - only the entry it already had is updated.
    if (!login.remember) return;

    this.add(worldId, patch);
  }

  /** Worlds that outlive the launch. The URL profile does not. */
  private savable(worldId: string): boolean {
    return !!worldId && worldId !== URL_PROFILE_ID;
  }

  private save(): void {
    LocalStorage.save(ACCOUNTS_KEY, JSON.stringify(this.book));
  }
}

export const ServerAccounts = new ServerAccountsStore();
