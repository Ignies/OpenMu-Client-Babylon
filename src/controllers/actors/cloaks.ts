import type { ClothSpec, Rgb } from '../cloth';
import type { CharacterClassNumber } from '../../core/types';
import type { Item } from '../../ecs/world';

/** What decides a character's cloths: `bCloak` and the cloth set of `RenderCharacter` (ZzzCharacter.cpp:9162-9985). */
export type CloakWearer = {
  /** `c->Class`. */
  charClass: CharacterClassNumber;
  /** `c->Wing`: the wing slot's item. */
  wing: Item | null;
  /** Inside Chaos Castle, where nobody wears one (:9183-9186). */
  chaosCastle: boolean;
};

/** Fills `out` with the cloths to hang by slot (`m_pCloth[i]`, null where none is drawn) and returns their `CloakLight`. */
export type CloakRule = (wearer: CloakWearer, out: (ClothSpec | null)[]) => Rgb;

const NONE: Rgb = [1, 1, 1];
let rule: CloakRule = () => NONE;

/** The wearers' content (`versions/shared/cloaks`) hands its rule in at boot. */
export function registerCloaks(cloaks: CloakRule): void {
  rule = cloaks;
}

/** The cloths `wearer` hangs now, into `out` (emptied first), and their light. */
export function cloaksFor(wearer: CloakWearer, out: (ClothSpec | null)[]): Rgb {
  out.length = 0;
  return rule(wearer, out);
}
