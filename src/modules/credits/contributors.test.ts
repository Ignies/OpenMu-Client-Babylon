import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCredits } from './contributors';

// The landing's credits read from GitHub: one list for the landing and the Ctrl+F8 window alike.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
});

const reply = (body: unknown) => ({ ok: true, json: async (): Promise<unknown> => body });

function github(routes: Record<string, unknown>) {
  const fetch = vi.fn(async (url: string) => {
    for (const [part, body] of Object.entries(routes)) if (url.includes(part)) return reply(body);
    return { ok: false, status: 404, json: async (): Promise<unknown> => null };
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

const ROUTES = {
  'Ignies/OpenMu-Client-Babylon/contributors': [
    { login: 'Ignies', contributions: 900 },
    { login: 'helper', contributions: 3 },
    { login: 'dependabot', type: 'Bot', contributions: 40 },
  ],
  'Ignies/OpenMu-Client-Babylon/issues': [
    { user: { login: 'tester' } },
    { user: { login: 'tester' } },
    { user: { login: 'helper' } },
    { user: { login: 'Ignies' }, pull_request: {} },
  ],
  'MUnique/OpenMU/contributors': [{ login: 'sven-n' }, { login: 'zTeam' }],
};

beforeEach(() => store.clear());

describe('loadCredits', () => {
  it('rolls the thanks, the writers, the playtesters, the reporters and everyone', async () => {
    github(ROUTES);
    const list = await loadCredits();
    expect(list.map(c => [c.kind, c.name, c.commits, c.reports])).toEqual([
      ['thanks', 'afrokick/muonlinejs', 0, 0],
      ['thanks', 'Sven-n', 0, 0],
      ['thanks', 'OpenMU Team', 0, 0],
      ['person', 'Ignies', 900, 0],
      ['person', 'helper', 3, 1],
      ['playtest', 'REGZPL', 0, 0],
      ['person', 'tester', 0, 2],
      ['everyone', '', 0, 0],
    ]);
    expect(list[2].roll).toEqual(['sven-n', 'zTeam']);
  });

  it('keeps the lists a day, then asks GitHub again', async () => {
    const fetch = github(ROUTES);
    await loadCredits();
    const calls = fetch.mock.calls.length;
    await loadCredits();
    expect(fetch.mock.calls.length).toBe(calls);
  });

  it('falls back to the kept lists, or the thanks alone, when GitHub is down', async () => {
    github({});
    const bare = await loadCredits();
    expect(bare.map(c => c.kind)).toEqual(['thanks', 'thanks', 'thanks', 'playtest', 'everyone']);

    github(ROUTES);
    await loadCredits();
    store.set('mu_credits_v3', JSON.stringify({ ...JSON.parse(store.get('mu_credits_v3') ?? '{}'), at: 0 }));
    github({});
    expect((await loadCredits()).some(c => c.name === 'Ignies')).toBe(true);
  });
});
