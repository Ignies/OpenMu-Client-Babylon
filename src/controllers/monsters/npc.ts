import type { CharacterClassNumber, PlayerClass } from '@/core/types';

/**
 * How an NPC type is drawn and heard when it is not a plain monster model: the optional fields of a
 * monster folder's `index.ts`. Pure data; the actors and sound controllers read them. See readme.md.
 */

/**
 * An NPC model file (`OpenNpc`): relative to `Data/NPC/`, or to the asset root when it starts with `/`.
 * `scale` only when its case sets one; the default is CreateCharacterPointer's 0.9.
 */
export type NpcModel = { readonly file: string; readonly scale?: number };

/** An item an NPC wears or carries, by items.json (group, index). */
export type NpcItem = { readonly group: number; readonly num: number; readonly lvl?: number };

/**
 * `CreateCharacter(Key, MODEL_PLAYER, …)` followed by a fixed `c->BodyPart[]` / `c->Weapon[]` kit: the
 * guards, doppelgangers and helper NPCs the original dresses inline. Each wears one armour set across
 * all five slots, named once by its items.json index.
 */
export type NpcGear = {
  /** `c->Class`; also the rig `updateBodyPartClassesAsync` falls back to. */
  readonly charClass: CharacterClassNumber;
  readonly playerClass: PlayerClass;
  /** items.json index shared by helm/armor/pants/gloves/boots. */
  readonly set: number;
  /** `c->BodyPart[].Level`. */
  readonly level?: number;
  /** Set when the original reaches the helm model directly (`MODEL_BODY_HELM + n`) and items.json has no such row. */
  readonly noHelm?: boolean;
  /** `c->Weapon[0]` - the main hand (AppearanceSystem's `leftHand` slot). */
  readonly mainHand?: NpcItem | null;
  /** `c->Weapon[1]` - the off hand. */
  readonly offHand?: NpcItem | null;
  /** `c->Wing` (group 12). */
  readonly wings?: NpcItem | null;
  /** `c->Helper` (group 13): the Dark Lord's mount. */
  readonly pet?: NpcItem | null;
  /** `Object.Scale` when its case sets one; else SetCharacterScale's 0.9 for the CLASS_WIZARD rig. */
  readonly scale?: number;
};

/** `MODEL_PLAYER` with `c->Object.SubType` set to a whole-body part file (`<dir><part>`); `scale` as `NpcModel`. */
export type NpcTransform = { readonly dir: string; readonly part: string; readonly scale?: number };

/** A trap: drawn with the world object `Object<world+1>/Object<object+1>` of the map it stands on. */
export type NpcTrap = { readonly object: number; readonly shadow: boolean };

/**
 * A town noise (`MoveCharacterVisual`). `oneIn` is `rand_fps_check(n)`: one chance in n per tick.
 * `frames` is a window `[from, to]` on the idle clip instead; the sound fires as the clip enters it.
 */
export type NpcVoice = {
  readonly sound: string;
  readonly oneIn?: number;
  readonly frames?: readonly [number, number];
};

/** One `PlayMonsterSoundGlobal` line: on the clip's start, each loop of it, or while it holds. */
export type NpcGlobalCue = {
  /** `MonsterActionType`. */
  readonly on: number;
  readonly when: 'start' | 'loop' | 'hold';
  readonly sound: string;
  /** `rand_fps_check(n)` on the event. */
  readonly oneIn?: number;
};

/** A `PlayMonsterSoundGlobal` voice: its mixer category and its lines. */
export type NpcGlobalVoice = { readonly bus: 'ambient' | 'monsters'; readonly cues: readonly NpcGlobalCue[] };
