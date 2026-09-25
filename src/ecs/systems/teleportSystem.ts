import type { Entity, ISystemFactory, World } from '../world';
import { PlayerAction } from '../../common/objects/enum';
import { applyPlayerActionSpeed } from '../../common/playSpeed';
import { playTeleportFlash } from '../../common/skillVisuals';
import { COMBAT_BUS } from '../../common/combatSounds';
import { playSfx } from '../../libs/sfx';
import type { Sounds } from '../../sound/recipes';
import type { Tile } from '../../common/teleportRules';

/**
 * The body side of Teleport and Teleport Ally: `CreateTeleportBegin` /
 * `CreateTeleportEnd` (ZzzEffectMagicSkill.cpp:161-179) and the `o->Teleport`
 * states they drive. Begin plays the clip, flashes BITMAP_SPARK+1 and
 * SOUND_MAGIC where the body stands and fades it out; End plays the clip from
 * frame 5, flashes at the new square and fades the body back in. A mount
 * fades with its rider (petSystem reads `teleportMountAlpha`).
 *
 * The hero does not wait for the server: his own Begin fades at the original
 * rate and lands him on the target once he is gone or after
 * HERO_MOVE_AFTER, whichever comes first, then plays End there.
 */

const TICKS_PER_SECOND = 25;
/** `Alpha()`: o->Alpha moves 0.05 a tick toward AlphaTarget (ZzzAI.cpp:172-192). */
const FADE_PER_TICK = 0.05;
/** The hero loses another 0.1 a frame while TELEPORT_BEGIN (ZzzInterface.cpp:2556-2563). */
const HERO_EXTRA_FADE_PER_TICK = 0.1;
/** A mount loses 0.1 a tick while its rider is BEGIN/TELEPORT, and is back at 1 otherwise (GOBoid.cpp:189-197). */
const MOUNT_FADE_PER_TICK = 0.1;
/**
 * The original holds the hero on the old square until the server answers. Here
 * he lands as soon as the fade is done or after this long: at the original's
 * 0.15 a tick he is at a quarter alpha by then, and the jump reads as instant.
 */
const HERO_MOVE_AFTER = 0.2;
/** `o->Alpha >= 0.7f`: no new Teleport and no walk below it (ClassAttack.cpp:1514, ZzzInterface.cpp:3080). */
const READY_ALPHA = 0.7;
/** A body faded out with no word from the server comes back where it stands. */
const HIDDEN_TIMEOUT = 3;
/** `o->AnimationFrame = 5.f` in CreateTeleportEnd. */
const END_FRAME = 5;
/** A Teleport Ally self cast on a player who entered scope this recently is OpenMU's arrival marker. */
const ARRIVAL_WINDOW = 1;

const MAGIC_SOUND: Sounds = 'Sound/sMagic';
const TELEKINESIS_SOUND: Sounds = 'Sound/eTelekinesis';

interface Fade {
  phase: 'begin' | 'hidden' | 'end';
  alpha: number;
  mountAlpha: number;
  /** Alpha lost per tick while fading out. */
  outPerTick: number;
  /** Seconds in the current phase. */
  t: number;
  skill: number;
  /** The hero's own jump: where he lands. */
  move: Tile | null;
  /** Out of scope already: removed once faded. */
  leave: boolean;
  /** CreateTeleportEnd's frame 5, applied once the clip is up. */
  seek: boolean;
}

const fades = new Map<Entity, Fade>();
const scopeEntered = new WeakMap<Entity, number>();
let clock = 0;
let worldRef: World | null = null;

function fadeOf(e: Entity): Fade {
  let f = fades.get(e);
  if (!f) {
    f = {
      phase: 'end',
      alpha: e.modelObject?.Alpha ?? 1,
      mountAlpha: 1,
      outPerTick: FADE_PER_TICK,
      t: 0,
      skill: 0,
      move: null,
      leave: false,
      seek: false,
    };
    fades.set(e, f);
  }
  return f;
}

/** `SetAction(o, PLAYER_SKILL_TELEPORT)`; `fromEnd` starts it at frame 5 once it is playing. */
function playClip(e: Entity, f: Fade, fromEnd: boolean): void {
  const anim = e.playerAnimation;
  const model = e.modelObject;
  if (!anim) return;
  const action = PlayerAction.PLAYER_SKILL_TELEPORT;
  if (model) applyPlayerActionSpeed(model, action, e.attributeSystem);
  if (model?.CurrentAction === action) model.restartAction();
  anim.action = action;
  if (e.pathfinding) e.pathfinding.path = null;
  f.seek = fromEnd;
}

function sound(key: Sounds, e: Entity): void {
  if (e.transform) playSfx(key, e.transform.pos, { bus: COMBAT_BUS });
}

/**
 * `CreateTeleportBegin`. `move` is the hero's own target square; `soundKey`
 * replaces SOUND_MAGIC (null for none).
 */
export function beginTeleport(
  e: Entity,
  skill: number,
  opts: { move?: Tile; clip?: boolean; soundKey?: Sounds | null } = {}
): void {
  const f = fadeOf(e);
  f.phase = 'begin';
  f.t = 0;
  f.skill = skill;
  f.move = opts.move ? { ...opts.move } : null;
  f.outPerTick = FADE_PER_TICK + (e.localPlayer ? HERO_EXTRA_FADE_PER_TICK : 0);
  f.leave = false;
  if (opts.clip !== false) playClip(e, f, false);
  if (worldRef) playTeleportFlash(worldRef.scene, skill, e, 'begin');
  const key = opts.soundKey === undefined ? MAGIC_SOUND : opts.soundKey;
  if (key) sound(key, e);
}

/**
 * `CreateTeleportEnd` where the body stands now. `magicSounds` SOUND_MAGICs
 * (Teleport Ally's arrival plays Begin and End on one body: two) and the
 * telekinesis of a Teleport Ally.
 */
export function endTeleport(
  e: Entity,
  skill: number,
  opts: { magicSounds?: number; telekinesis?: boolean; flashes?: number } = {}
): void {
  const f = fadeOf(e);
  f.phase = 'end';
  f.t = 0;
  f.skill = skill;
  f.move = null;
  f.mountAlpha = 1;
  // Re-added on the new square a moment ago: it comes in from nothing, not whole.
  if (justArrived(e)) f.alpha = 0;
  playClip(e, f, true);
  if (worldRef) {
    for (let i = 0; i < (opts.flashes ?? 1); i++) playTeleportFlash(worldRef.scene, skill, e, 'end');
  }
  for (let i = 0; i < (opts.magicSounds ?? 1); i++) sound(MAGIC_SOUND, e);
  if (opts.telekinesis) sound(TELEKINESIS_SOUND, e);
}

/** Drop any teleport state and show the body whole (a warp, a death). */
export function cancelTeleport(e: Entity): void {
  if (!fades.delete(e)) return;
  e.modelObject?.setFadeAlpha(1);
}

/**
 * Out of scope during a Begin: OpenMU drops the teleporting player 300 ms in,
 * before the fade is through. He is kept until he is gone. False when the
 * caller should remove him now.
 */
export function deferLeave(e: Entity): boolean {
  const f = fades.get(e);
  if (!f || f.phase === 'end') return false;
  f.leave = true;
  return true;
}

/** The body is in any teleport state (no stride between two positions). */
export function isTeleporting(e: Entity): boolean {
  return fades.has(e);
}

/** BEGIN / TELEPORT, or back but below 0.7 alpha: no new Teleport, no walk. */
export function teleportBusy(e: Entity): boolean {
  const f = fades.get(e);
  return !!f && (f.phase !== 'end' || f.alpha < READY_ALPHA);
}

/** The alpha a mount of `owner` is drawn at. */
export function teleportMountAlpha(owner: Entity): number {
  return fades.get(owner)?.mountAlpha ?? 1;
}

/** A player entered scope (logic.ts): OpenMU re-adds a teleported player, then marks the arrival. */
export function noteScopeEntry(e: Entity): void {
  scopeEntered.set(e, clock);
}

/** Entered scope within the last ARRIVAL_WINDOW seconds. */
export function justArrived(e: Entity): boolean {
  const at = scopeEntered.get(e);
  return at !== undefined && clock - at <= ARRIVAL_WINDOW;
}

/** The hero's jump: onto the square, the path reset, then End there from nothing. */
function land(world: World, e: Entity, f: Fade): void {
  const to = f.move!;
  const pos = e.transform!.pos;
  pos.x = to.x;
  pos.z = to.y;
  pos.y = world.getTerrainHeight(to.x, to.y);
  const pathfinding = e.pathfinding;
  if (pathfinding) {
    pathfinding.path = null;
    pathfinding.from = { x: to.x, y: to.y };
    pathfinding.to = { x: to.x, y: to.y };
  }
  // The original only lands a body already under 0.1 (TELEPORT); End starts it from nothing.
  f.alpha = 0;
  endTeleport(e, f.skill);
}

export const TeleportSystem: ISystemFactory = world => {
  worldRef = world;

  return {
    update: dt => {
      clock += dt;
      if (fades.size === 0) return;
      const ticks = dt * TICKS_PER_SECOND;

      for (const [e, f] of fades) {
        if (!world.has(e) || e.dying) {
          fades.delete(e);
          continue;
        }
        const model = e.modelObject;
        // A body still loading has nothing to fade; its End waits for it.
        if (!model?.Ready) continue;
        f.t += dt;

        if (f.seek && model.CurrentAction === PlayerAction.PLAYER_SKILL_TELEPORT) {
          model.seekActionFrame(END_FRAME);
          f.seek = false;
        }

        if (f.phase === 'begin') {
          f.alpha = Math.max(0, f.alpha - f.outPerTick * ticks);
          f.mountAlpha = Math.max(0, f.mountAlpha - MOUNT_FADE_PER_TICK * ticks);
          if (f.move && (f.alpha <= 0 || f.t >= HERO_MOVE_AFTER)) {
            land(world, e, f);
          } else if (f.alpha <= 0) {
            f.phase = 'hidden';
            f.t = 0;
          }
        } else if (f.phase === 'hidden') {
          f.mountAlpha = Math.max(0, f.mountAlpha - MOUNT_FADE_PER_TICK * ticks);
          if (f.t >= HIDDEN_TIMEOUT) {
            f.phase = 'end';
            f.t = 0;
            f.mountAlpha = 1;
          }
        } else {
          f.alpha = Math.min(1, f.alpha + FADE_PER_TICK * ticks);
          f.mountAlpha = 1;
        }

        if (f.leave && f.alpha <= 0) {
          fades.delete(e);
          if (!e.objOutOfScope) world.addComponent(e, 'objOutOfScope', true);
          continue;
        }

        model.setFadeAlpha(f.alpha);
        if (f.phase === 'end' && f.alpha >= 1) fades.delete(e);
      }
    },
  };
};
