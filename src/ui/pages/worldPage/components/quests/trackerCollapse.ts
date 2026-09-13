/**
 * Which tracker rows the player has folded, per character. The hot keys are
 * kept the same way (`common/keyBindings.ts`): the character's own entry if it
 * has one, the shared entry otherwise, so a new character starts from what the
 * last one left.
 *
 * The only writer of that state; the tracker reads it and toggles it.
 */
import { observable, reaction, runInAction } from 'mobx';
import { LocalStorage } from '../../../../../libs/localStorage';
import { Store } from '../../../../../store';

const STORAGE_KEY = 'mu_quest_tracker';

const folded = observable.set<string>();

/** Whose folds are live: a character name, or '' for the shared set. */
let profile = '';

function storageKeyOf(name: string): string {
  return name ? `${STORAGE_KEY}:${name}` : STORAGE_KEY;
}

function read(name: string): string[] {
  const stored = LocalStorage.load(storageKeyOf(name));
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function loadProfile(name: string): void {
  profile = name;
  const ids = name ? read(name) : [];
  runInAction(() => folded.replace(ids.length ? ids : read('')));
}

reaction(
  () => Store.playerData.name,
  name => loadProfile(name),
  { fireImmediately: true }
);

/** Whether this quest's objectives are folded away. */
export function trackerFolded(id: string): boolean {
  return folded.has(id);
}

/** The click on a quest title. */
export function toggleTrackerFold(id: string): void {
  runInAction(() => {
    if (folded.has(id)) folded.delete(id);
    else folded.add(id);
  });
  LocalStorage.save(storageKeyOf(profile), JSON.stringify([...folded]));
}
