import type { ClothSet, Rgb } from '../cloth';
import type { CharacterClassNumber } from '../../core/types';
import type { Item } from '../../ecs/world';

/** What decides a character's cloths: `bCloak` and the cloth set of `RenderCharacter` (ZzzCharacter.cpp:9162-9985). */
export type CloakWearer = {
  /** `c->Class`. */
  charClass: CharacterClassNumber;
  /** `c->Wing`: the wing slot's item, and what it held the frame before (a change may `DeleteCloth`). */
  wing: Item | null;
  wingBefore: Item | null;
  /** The armour slot's item; null is the class's own body (`MODEL_BODY_ARMOR + skin`). */
  armor: Item | null;
  /** A transformation worn on the rig (`o->SubType`, a ring's body): its part file, else null. */
  skin: string | null;
  /** Inside Chaos Castle, where nobody wears one (:9183-9186). */
  chaosCastle: boolean;
  /** `c->Key` and whether it is the hero: who the duel colours (:9234-9246). */
  netId: number | null;
  hero: boolean;
  /** `c->GuildMarkIndex`: the guild id, whose name Battle Soccer colours (:9190-9232). */
  guild: number | null;
  /** `c->MonsterIndex`: the monster this body is (a monster, or a player in a monster's body), else null. */
  monster: number | null;
  /** `o->Type == MODEL_PLAYER`: a body on the player rig, which a class cloak needs (:9164-9171). */
  rig: boolean;
  /** The pants part as drawn (`Type` of its `RenderPartObject`): its model file, else null. */
  pants: string | null;
  /** `RenderCharacter`'s shadow pass runs, drawing the parts a second time (:8590-8612). */
  shadowPass: boolean;
  /** The body fades out dead: `DeadCharacter` deletes its cloths every frame (:3233-3251), so its sets are always new. */
  fading: boolean;
};

/** What the rule does to a wearer's set: the original's `m_pCloth` array, `m_byNumCloth` and the loop's draws. */
export type CloakSet = Pick<ClothSet, 'built' | 'count' | 'has' | 'build' | 'destroy' | 'draw' | 'drop'>;

/**
 * Builds, destroys and draws the wearer's cloths this frame as `RenderCharacter` does, and returns their
 * `CloakLight`. The sets' draws were cleared before; a cloth left undrawn is not stepped. `pants` is the
 * pants part's set (`p->m_pCloth`) on the player rig, else null.
 */
export type CloakRule = (wearer: CloakWearer, set: CloakSet, pants: CloakSet | null) => Rgb;

const NONE: Rgb = [1, 1, 1];
let rule: CloakRule = () => NONE;

/** The wearers' content (`versions/shared/cloaks`) hands its rule in at boot. */
export function registerCloaks(cloaks: CloakRule): void {
  rule = cloaks;
}

/** This frame's cloths of `wearer` on `set` (and its pants'), and their light. */
export function cloaksFor(wearer: CloakWearer, set: CloakSet, pants: CloakSet | null = null): Rgb {
  return rule(wearer, set, pants);
}
