import type { PlayerAction, ServerPlayerActionType } from '@versions/shared/objects/enum';

/** An original enum name: `PLAYER_ATTACK_FIST`. */
export type PlayerActionName = keyof typeof PlayerAction;

/**
 * A clip's `PlaySpeed`: a flat rate, a base plus a stat factor (`(base + factor) * times`), or the
 * walk tables' Rage Fighter split. `attackSpeed` is `AttackSpeed1`, `magicSpeed` is `MagicSpeed2`
 * `magicSpeedStepped` is `MagicSpeed1` (AttackSpeed1's stepped factor over the magic speed) and
 * `rageAttackSpeed` is `RageAttackSpeed`, AttackSpeed * 0.002 (ZzzCharacter.cpp:1016).
 */
export type SpeedRule =
  | number
  | { base: number; plus: 'attackSpeed' | 'magicSpeed' | 'magicSpeedStepped' | 'rageAttackSpeed'; times?: number }
  | { base: number; rageFighter: number };

/** A `PlayAnimation` slow-down: `scale` while `after < frame < before`, Dark Lords only if `darkLordOnly`. */
export type FrameSpeed = { after: number; before?: number; scale: number; darkLordOnly?: boolean };

/** One player clip (`PLAYER_*`): everything the anim controller answers about it. */
export type AnimationDef = {
  /** The PlayerAction id: the GLB clip index and the wire value. Never renumber. */
  action: number;
  /** The original's enum name. */
  name: string;
  /** Other enum names with the same id (`PLAYER_ATTACK_END`). */
  aliases?: readonly string[];
  speed: SpeedRule;
  frameSpeeds?: readonly FrameSpeed[];
  /** A Freeze or Cold slows it with the walk (ZzzCharacter.cpp:496-542). */
  debuffSlows?: boolean;
  /** A basic or skill swing: PLAYER_ATTACK_FIST .. PLAYER_ATTACK_END. */
  attack?: boolean;
  /** The hero is busy while it plays (ZzzInterface.cpp:7570-7580). */
  skill?: boolean;
  /** A social clip: plays once and hands back to idle. */
  emote?: boolean;
  /** Plays once and hands back to idle for another reason (attack, skill and emote clips already do). */
  oneShot?: boolean;
  /** A standing idle clip, any weapon (the `SetActionClass` gate). */
  idle?: boolean;
  /** The weapons go on the back while it plays (ZzzCharacter.cpp:14961). */
  social?: boolean;
  /** A rest pose (sit, heal, pose) the character holds until it moves. */
  rest?: boolean;
  /** Wings flap while it plays (`RenderCharacterBackItem`, ZzzCharacter.cpp:15107-15129). */
  wingsFlap?: boolean;
  /** The clip a female character plays instead (`SetActionClass`). */
  female?: PlayerActionName;
  /** The server actions (0x18) that play it. */
  serverActions?: readonly ServerPlayerActionType[];
};

/** An animation file's default export. */
export function defineAnimation(def: AnimationDef): AnimationDef {
  return def;
}

export class AnimationRegistry {
  private readonly byAction = new Map<number, AnimationDef>();
  private readonly byName = new Map<string, AnimationDef>();
  /** Server action -> clip, filled from each file's `serverActions`. */
  readonly serverToClient: Partial<Record<ServerPlayerActionType, PlayerAction>> = {};

  add(defs: Iterable<AnimationDef>): void {
    for (const d of defs) {
      this.byAction.set(d.action, d);
      for (const n of [d.name, ...(d.aliases ?? [])]) this.byName.set(n, d);
      for (const s of d.serverActions ?? []) this.serverToClient[s] = d.action;
    }
  }

  get(action: number): AnimationDef | undefined {
    return this.byAction.get(action);
  }

  named(name: string): AnimationDef | undefined {
    return this.byName.get(name);
  }

  all(): AnimationDef[] {
    return [...this.byAction.values()].sort((a, b) => a.action - b.action);
  }
}

/** The game's player clips, filled by versions/shared/animations when a version loads. */
export const animations = new AnimationRegistry();

export function registerAnimations(defs: Iterable<AnimationDef>): void {
  animations.add(defs);
}
