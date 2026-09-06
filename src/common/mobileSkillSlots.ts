import { makeAutoObservable, runInAction } from 'mobx';
import { LocalStorage } from '../libs/localStorage';
import { isHotbarSkill } from './skillCasting';

/**
 * The three skills linked to the mobile pad, per character.
 *
 * Deliberately not `Store.skillHotkeys`: those ten are the digit keys and are
 * round-tripped to the server through `SaveKeyConfiguration`, so borrowing
 * three of them would rewrite the player's desktop bar from their phone.
 * These live in the browser only, keyed by character name so two characters
 * on one device keep their own pads.
 */

const STORAGE_KEY = 'mu_mobile_skills';

export const MOBILE_SKILL_SLOTS = 3;

const EMPTY: number[] = new Array(MOBILE_SKILL_SLOTS).fill(-1);

type Saved = Record<string, number[]>;

function load(): Saved {
  const stored = LocalStorage.load(STORAGE_KEY);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored) as Saved;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export const MobileSkillSlots = new (class _MobileSkillSlots {
  private saved: Saved = load();
  private character = '';
  /** The live pad: three wire skill numbers, -1 for empty. */
  slots: number[] = EMPTY.slice();

  constructor() {
    makeAutoObservable(this, { slots: true });
  }

  /** The character changed: swap in that character's pad. */
  use(character: string): void {
    if (this.character === character) return;
    this.character = character;
    const stored = this.saved[character];
    runInAction(() => {
      this.slots = EMPTY.map((_, i) => {
        const number = stored?.[i];
        return typeof number === 'number' && isHotbarSkill(number) ? number : -1;
      });
    });
  }

  /** `number` < 0 clears the slot. A skill sits on one slot only. */
  assign(slot: number, number: number): void {
    if (slot < 0 || slot >= MOBILE_SKILL_SLOTS) return;
    runInAction(() => {
      const next = this.slots.map(n => (n === number ? -1 : n));
      next[slot] = number >= 0 && isHotbarSkill(number) ? number : -1;
      this.slots = next;
    });
    this.save();
  }

  /** Login / skill list update: a slot may not point at a skill we do not have. */
  prune(learned: readonly number[]): void {
    const known = new Set(learned);
    const next = this.slots.map(n => (n >= 0 && known.has(n) ? n : -1));
    if (next.every((n, i) => n === this.slots[i])) return;
    runInAction(() => {
      this.slots = next;
    });
    this.save();
  }

  private save(): void {
    if (!this.character) return;
    this.saved = { ...this.saved, [this.character]: this.slots.slice() };
    LocalStorage.save(STORAGE_KEY, JSON.stringify(this.saved));
  }
})();
