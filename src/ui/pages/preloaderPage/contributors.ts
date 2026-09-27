/**
 * Who made the client, for the credits that drift over the map: the projects
 * it stands on, the people who wrote it, the people who reported its bugs, and
 * the people who playtested it.
 *
 * Read from GitHub's own lists for the repository, so a new contributor or a
 * new reporter shows up without anyone touching the client. Commits made
 * without a GitHub account come back under their git name. The lists are kept
 * for a day in this browser, and the last ones kept are used if GitHub cannot
 * be reached.
 */

const REPO = 'https://api.github.com/repos/Ignies/OpenMu-Client-Babylon';
const CONTRIBUTORS = `${REPO}/contributors?per_page=100&anon=1`;
const ISSUES = `${REPO}/issues?state=all&per_page=100`;

/** Pages of issues read at most: GitHub allows a visitor sixty calls an hour. */
const ISSUE_PAGES = 3;

/** The server the client talks to, whose own contributors roll under its thanks. */
const OPENMU = 'https://api.github.com/repos/MUnique/OpenMU/contributors?per_page=100&anon=1';
const OPENMU_PAGES = 2;

/**
 * The projects and people this client is built on, thanked first on every
 * lap, with what they are thanked for and whose contributors roll under them.
 */
const SPECIAL_THANKS: { name: string; note?: string; roll?: boolean }[] = [
  { name: 'afrokick/muonlinejs' },
  { name: 'Sven-n', note: 'OpenMU  ·  MuMain' },
  { name: 'OpenMU Team', roll: true },
];

/** Playtesters thanked by name; everyone else who played along closes the list. */
const PLAYTESTERS = ['REGZPL'];

const KEY = 'mu_credits_v3';
const FRESH_MS = 24 * 60 * 60 * 1000;

/**
 * `thanks`: a project or person the client stands on. `person`: someone who
 * wrote code or reported bugs. `playtest`: a playtester by name. `everyone`:
 * everyone else who playtested, named by the page in the player's language.
 */
export type CreditKind = 'thanks' | 'person' | 'playtest' | 'everyone';

export type Credit = {
  kind: CreditKind;
  name: string;
  commits: number;
  reports: number;
  /** What a thanks is for, under the name. */
  note?: string;
  /** Names drawn round the credit's mark as villages (`villages.ts`). */
  roll?: string[];
};

type Stored = { at: number; list: Credit[] };

type GithubContributor = {
  type?: string;
  login?: string;
  name?: string;
  contributions?: number;
};

type GithubIssue = {
  pull_request?: unknown;
  user?: { login?: string; type?: string };
};

const KINDS = new Set<unknown>(['thanks', 'person', 'playtest', 'everyone']);

/** Whether a kept entry is a credit this page can draw: anything else would take the page down. */
function isCredit(value: unknown): value is Credit {
  const c = value as Partial<Credit> | null;
  return (
    !!c &&
    KINDS.has(c.kind) &&
    typeof c.name === 'string' &&
    typeof c.commits === 'number' &&
    typeof c.reports === 'number' &&
    (c.note === undefined || typeof c.note === 'string') &&
    (c.roll === undefined ||
      (Array.isArray(c.roll) && c.roll.every(n => typeof n === 'string')))
  );
}

/** The lists kept from last time, or null when there are none or they are not ones this page wrote. */
function stored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    const kept = raw ? (JSON.parse(raw) as Partial<Stored>) : null;
    if (
      !kept ||
      typeof kept.at !== 'number' ||
      !Array.isArray(kept.list) ||
      !kept.list.every(isCredit)
    ) {
      return null;
    }
    return kept as Stored;
  } catch {
    return null;
  }
}

async function github<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()) as T;
}

/** Everyone in a contributors list who is not a bot, once each, most commits first. */
function names(contributors: GithubContributor[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];

  for (const entry of contributors) {
    if (entry.type === 'Bot') continue;
    const name = (entry.login || entry.name || '').trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    list.push(name);
  }

  return list;
}

/**
 * The credits in the order they roll: the special thanks, then one entry per
 * person - the same name in two cases is one person - writers by commits, the
 * playtesters, then those who only reported bugs, by reports.
 */
export function tidy(
  contributors: GithubContributor[],
  issues: GithubIssue[],
  openmu: GithubContributor[] = []
): Credit[] {
  const byName = new Map<string, Credit>();

  const person = (name: string) => {
    const key = name.toLowerCase();
    let known = byName.get(key);
    if (!known) {
      known = { kind: 'person', name, commits: 0, reports: 0 };
      byName.set(key, known);
    }
    return known;
  };

  for (const entry of contributors) {
    if (entry.type === 'Bot') continue;
    const name = (entry.login || entry.name || '').trim();
    if (name) person(name).commits += entry.contributions ?? 0;
  }

  for (const issue of issues) {
    if (issue.pull_request || issue.user?.type === 'Bot') continue;
    const name = (issue.user?.login || '').trim();
    if (name) person(name).reports += 1;
  }

  const people = [...byName.values()].sort(
    (a, b) => b.commits - a.commits || b.reports - a.reports
  );
  const credit = (kind: CreditKind, name: string): Credit => ({
    kind,
    name,
    commits: 0,
    reports: 0,
  });

  const team = names(openmu);

  return order([
    ...SPECIAL_THANKS.map(({ name, note, roll }) => ({
      ...credit('thanks', name),
      ...(note ? { note } : {}),
      ...(roll && team.length ? { roll: team } : {}),
    })),
    ...people,
    ...PLAYTESTERS.map(name => credit('playtest', name)),
    credit('everyone', ''),
  ]);
}

/** Where each part of the credits rolls, in turn. */
const rank = (c: Credit) =>
  c.kind === 'thanks'
    ? 0
    : c.kind === 'person' && c.commits > 0
      ? 1
      : c.kind === 'playtest'
        ? 2
        : c.kind === 'person'
          ? 3
          : 4;

/**
 * The credits' running order: the special thanks, the writers, the
 * playtesters, those who only reported bugs, and everyone else. Kept lists
 * are put in it too, so a new order shows without waiting a day.
 */
function order(list: Credit[]): Credit[] {
  return [...list].sort((a, b) => rank(a) - rank(b));
}

export async function loadCredits(): Promise<Credit[]> {
  const kept = stored();
  if (kept && Date.now() - kept.at < FRESH_MS) return order(kept.list);

  try {
    const contributors = await github<GithubContributor[]>(CONTRIBUTORS);
    const issues: GithubIssue[] = [];

    for (let page = 1; page <= ISSUE_PAGES; page++) {
      const batch = await github<GithubIssue[]>(`${ISSUES}&page=${page}`);
      issues.push(...batch);
      if (batch.length < 100) break;
    }

    // The server's list is a bonus: without it the team keeps the roll it had
    // last time, or is thanked on its own, and the lists are not kept, so the
    // next visit asks again rather than going a day without it.
    let openmu: GithubContributor[] | null = [];
    try {
      for (let page = 1; page <= OPENMU_PAGES; page++) {
        const batch = await github<GithubContributor[]>(`${OPENMU}&page=${page}`);
        openmu.push(...batch);
        if (batch.length < 100) break;
      }
    } catch {
      openmu = null;
    }

    const list = tidy(contributors, issues, openmu ?? []);

    if (!openmu) {
      const roll = kept?.list.find(entry => entry.roll)?.roll;
      const rolled = SPECIAL_THANKS.find(entry => entry.roll)?.name;
      return roll
        ? list.map(entry =>
            entry.kind === 'thanks' && entry.name === rolled
              ? { ...entry, roll }
              : entry
          )
        : list;
    }

    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ at: Date.now(), list } satisfies Stored)
      );
    } catch {
      // Private mode: the lists are simply fetched again next time.
    }

    return list;
  } catch {
    return kept ? order(kept.list) : tidy([], []);
  }
}
