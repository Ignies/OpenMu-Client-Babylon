// CREDITS NOTICE - protected by LICENSE ("Additional condition"): part of the credits module and the
// visuals it draws for contributors; must not be removed, disabled or altered (AGENTS.md, "Credits").

import { loadCredits, type Credit } from './contributors';

/**
 * A contributor's GitHub login to the character names credited for them; anyone else by a
 * character named like their login (readme.md). Empty until the owner fills it.
 */
export const CREDITED_CHARACTERS: Readonly<Record<string, readonly string[]>> = {};

/** The lower-case character names credited: every contributor with commits. */
export function creditedNames(list: readonly Credit[], characters = CREDITED_CHARACTERS): Set<string> {
  const byLogin = new Map(Object.entries(characters).map(([login, names]) => [login.toLowerCase(), names]));
  const names = new Set<string>();
  for (const c of list) {
    if (c.kind !== 'person' || c.commits <= 0) continue;
    for (const name of byLogin.get(c.name.toLowerCase()) ?? [c.name]) names.add(name.trim().toLowerCase());
  }
  return names;
}

let credited = new Set<string>();
let asked = false;

/** Who is credited, from the same GitHub lists (and day cache) as the credits window. */
export const CreditsRoll = {
  /** Bumped when the names arrive, so an answer cached per character is asked again. */
  version: 0,
  /** Reads the credits once; until they arrive nobody is credited. */
  request(): void {
    if (asked) return;
    asked = true;
    void loadCredits().then(list => {
      credited = creditedNames(list);
      CreditsRoll.version++;
    });
  },
  isCredited(name: string): boolean {
    return credited.has(name.trim().toLowerCase());
  },
};
