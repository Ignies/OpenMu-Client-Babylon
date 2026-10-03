import type { MonsterBodyFx } from './bodyFx';
import type { NpcGear, NpcGlobalVoice, NpcModel, NpcTransform, NpcTrap, NpcVoice } from './npc';

/** The original client's monster table row (`Monster.txt`), without the number and name. */
export type MonsterStats = {
  Rate: number;
  Level: number;
  HP: number;
  MP: number;
  MinDmg: number;
  MaxDmg: number;
  Def: number;
  MagDef: number;
  AttackSuccess: number;
  Move: number;
  AttType: number;
  Range: number;
  View: number;
  MoveSpeed: number;
  AttSpeed: number;
  Regen: number;
  Attri: number;
  ItemR: number;
  MoneyR: number;
  MaxI: number;
  ResWind: number;
  ResPois: number;
  ResIce: number;
  ResWater: number;
  ResFire: number;
};

/**
 * One monster or NPC type (the number the server sends in `AddNpcsToScope`). See monsters/readme.md.
 * `stats` is the original table's row, absent for types that table does not have.
 */
export type MonsterDef = {
  Numb: number;
  Name: string;
  /** Maximum health, from the server's own definitions (the protocol never sends it). */
  maxHealth?: number;
  /**
   * How it is drawn (`Setting_Monster`, ZzzCharacter.cpp): the monster model (`Monster/Monster<type+1>.glb`),
   * `Object.Scale`, and `Object.HiddenMesh` for types that share a model and hide a mesh.
   */
  model?: { type: number; scale: number; hiddenMesh?: number };
  /** `c->SubType` the original creates this type with (9: Kalima's large centurions, Kundun's candidates). */
  subType?: number;
  /** Spawned but never drawn (`Object.Visible = false`): the actors controller loads no model. */
  hidden?: boolean;
  /** An NPC drawn from its own model file instead of a monster model. */
  npcModel?: NpcModel;
  /** A player-rig NPC in a fixed kit. */
  gear?: NpcGear;
  /** A player rig whose whole body is one part file. */
  transformed?: NpcTransform;
  /** A trap, drawn with the world object of the map it stands on. */
  trap?: NpcTrap;
  /** Its town noise (`MoveCharacterVisual`). */
  voice?: NpcVoice;
  /** Its `PlayMonsterSoundGlobal` lines, also heard from a player wearing it as a skin. */
  globalVoice?: NpcGlobalVoice;
  /** Skills whose cast sound this type never plays (the sound controller's `monsterCastQuiet`). */
  quietCasts?: readonly number[];
  /** Its Teleport (skill 6) on `world` plays `sound` instead of CreateTeleportBegin. */
  teleport?: MonsterTeleport;
  /** The skill whose AttackTime replays the meteorite storm sound every frame (a trap's). */
  stormSkill?: number;
  /** The light it carries while in scope (the lighting controller's `characterLightFor`). */
  light?: MonsterLight;
  /** What its body throws off or carries (`bodyFx.ts`; the fx controller's `monsterVisualFor`). */
  bodyFx?: MonsterBodyFx;
  stats?: MonsterStats;
};

/**
 * `MonsterDef.light` (`MoveCharacterVisual`, ZzzCharacter.cpp:5790-6005): a flickering forge or
 * brazier light at waist height; fire that takes light off the floor (-1.3, range 3); or a glow it
 * carries (ours, Enhanced/Ultra only: `height` over the feet, waist when omitted; `color` the
 * amber card when omitted, or the cyan of a hand holding `lightning2`).
 */
export type MonsterLight =
  | { readonly kind: 'forge'; readonly color: readonly [number, number, number]; readonly range: number }
  | { readonly kind: 'dark' }
  | {
      readonly kind: 'carried';
      readonly range: number;
      readonly height?: number;
      readonly color?: readonly [number, number, number] | 'lightning';
    };

/** `MonsterDef.teleport`: `channels` is the wave's `LoadWaveFile` count. */
export type MonsterTeleport = { readonly sound: string; readonly channels: number; readonly world: number };

/** What `get` returns: the table row as it always was, number and name included. */
export type MonsterRow = MonsterStats & { Numb: number; Name: string };

/** A monster file's default export. */
export function defineMonster(monster: MonsterDef): MonsterDef {
  return monster;
}
