import type { Entity, ISystemFactory } from '../world';
import { Vector3, type IVector3Like } from '../../controllers/render/babylon/exports';
import { REFERENCE_FPS } from '../../controllers/anim/playSpeed';
import { monsterModelRegistry, monsterRegistry } from '../../controllers/monsters';
import { inChaosCastle } from '../../controllers/actors/locomotion';
import { spawnBomb } from '../../controllers/fx/deathVisuals';
import { playUiSound } from '../../controllers/sound/sfx';
import { MonsterActionType, PlayerAction } from '@versions/shared/objects/enum';
import { createAngleDeg } from '../../core/turnAngle';
import { Ecs } from '../current';

/**
 * The server's instant move (`ObjectMoved`, C1 15) slides the body in. `ReceiveMovePosition` sets
 * `JumpTime = 1` (WSclient.cpp:2127-2153) and `PushingCharacter` (ZzzCharacter.cpp:3144-3203) moves
 * the body a share of the way to the new tile every 25 fps tick, on the ground, for 15 ticks, then
 * puts it there. The position lands at once here; `transform.posOffset` carries what is left.
 * Chaos Castle aims at the tile's corner and stops the body there; the hero takes no input and no
 * gate while sliding (`isSliding`). The ball's hop and roll are at the end. Readme: "Notes".
 */

/** `Speed = 0.2f`: the share of the way left that one tick covers. */
const SPEED = 0.2;
/** `JumpTime > 15`: the body is put on the tile. */
const SLIDE_TICKS = 15;
const CM = 0.01;
const RAD = Math.PI / 180;

type Slide = {
  /** The offset the body had before (a character's tile centre), given back at the end. */
  base: IVector3Like | undefined;
  /** Where the body is aimed, as an offset: the base, or in Chaos Castle the tile corner (0). */
  goalX: number;
  goalZ: number;
  /** Where it was drawn from, relative to the goal. */
  fromX: number;
  fromZ: number;
  /** The offset written while sliding. */
  offset: IVector3Like;
  /** The share of the way left after a tick (1 - `Speed`). */
  keep: number;
  ticks: number;
  /** Chaos Castle: aims at the corner, keeps its height, and is left there. */
  corner: boolean;
  /** `SetPlayerStop` on the tile (Chaos Castle, the Crust). */
  stops: boolean;
  /** Left on its Chaos Castle corner: the tile it landed on and the height it kept. */
  park: { x: number; z: number; y: number } | null;
};

const slides = new Map<Entity, Slide>();
const bombAt = new Vector3();

/** `JumpTime > 0`: the body is still sliding in (`MoveHero` and the gate check wait for the hero). */
export function isSliding(body: Entity | null | undefined): boolean {
  const s = body ? slides.get(body) : undefined;
  return !!s && !s.park;
}

/** `SetPlayerStop`: the stop clip (the animation system picks the class's own) or `MONSTER01_STOP1`. */
function stop(body: Entity): void {
  if (body.dying) return;
  const anim = body.playerAnimation;
  if (anim) {
    anim.action = PlayerAction.PLAYER_STOP_MALE;
    anim.run = 0;
  } else if (body.monsterAnimation && body.monsterAnimation.action !== MonsterActionType.Die) {
    body.monsterAnimation.action = MonsterActionType.Stop1;
  }
}

/** WSclient.cpp:2134-2141: a hop of 20 cm a tick, a roll of 400 degrees a tile, SOUND_MENU01 and sparks. */
function kick(ball: NonNullable<Entity['ball']>, t: NonNullable<Entity['transform']>, x: number, y: number, z: number): void {
  ball.gravity = 20;
  ball.spinZ = (t.pos.x - Math.floor(x)) * 400;
  ball.spinX = (Math.floor(z) - t.pos.z) * 400;
  playUiSound('menuMove');
  const scene = Ecs.world?.scene;
  if (!scene) return;
  // `CreateBomb(o->Position, false)`: where it was drawn, 80 cm up.
  bombAt.set(x + (t.posOffset?.x ?? 0), y + (30 + ball.height + 80) * CM, z + (t.posOffset?.z ?? 0));
  spawnBomb(scene, bombAt, false);
}

/** The body file's own slide rule, if it has one (the Crust's). */
const ownSlide = (body: Entity) =>
  body.npcType === undefined ? undefined : monsterModelRegistry.get(monsterRegistry.model(body.npcType)?.type ?? -1)?.slide;

/** `body` was just put on its tile by the server (`ObjectMoved`) from (x, y, z): draw it sliding there. */
export function startPositionSlide(body: Entity, x: number, y: number, z: number): void {
  const t = body.transform;
  if (!t) return;
  if (body.ball) kick(body.ball, t, x, y, z);
  slide(body, t, x, y, z);
}

/**
 * `ReceiveMoveCharacter`'s MODEL_CRUST branch (WSclient.cpp:2093-2101): a body whose file says its walk
 * slides is put on the target tile, faces it (`CreateAngle`), plays its walk clip and slides there.
 * False for every other body, which walks its path.
 */
export function startWalkSlide(body: Entity, tx: number, ty: number): boolean {
  const t = body.transform;
  const world = Ecs.world;
  if (!t || !world || !ownSlide(body)?.walks) return false;
  const { x, y, z } = t.pos;
  t.rot.y = createAngleDeg(x + (t.posOffset?.x ?? 0), z + (t.posOffset?.z ?? 0), tx, ty) * RAD;
  t.pos.x = tx;
  t.pos.z = ty;
  t.pos.y = world.getTerrainHeight(tx, ty);
  slide(body, t, x, y, z);
  if (body.monsterAnimation) body.monsterAnimation.action = MonsterActionType.Walk;
  return true;
}

function slide(body: Entity, t: NonNullable<Entity['transform']>, x: number, y: number, z: number): void {
  // A slide still running (or a parked corner) carries on from where the body is drawn.
  const running = slides.get(body);
  const base = running ? running.base : t.posOffset;
  const now = running ? running.offset : base;
  const offset = {
    x: (now?.x ?? 0) + x - t.pos.x,
    y: (now?.y ?? 0) + y - t.pos.y,
    z: (now?.z ?? 0) + z - t.pos.z,
  };
  const world = Ecs.world;
  const corner = !!world && inChaosCastle(world.mapIndex);
  const own = ownSlide(body);
  const goalX = corner ? 0 : (base?.x ?? 0);
  const goalZ = corner ? 0 : (base?.z ?? 0);
  slides.set(body, {
    base,
    goalX,
    goalZ,
    fromX: offset.x - goalX,
    fromZ: offset.z - goalZ,
    offset,
    keep: 1 - (own?.speed ?? SPEED),
    ticks: 0,
    corner,
    stops: corner || !!own?.stops,
    park: null,
  });
  t.posOffset = offset;
}

/** A parked corner fades into the base over the first tile it walks (MovePath starts from where it is drawn). */
function stepPark(body: Entity, t: NonNullable<Entity['transform']>, s: Slide, park: NonNullable<Slide['park']>): void {
  const k = Math.min(1, Math.hypot(t.pos.x - park.x, t.pos.z - park.z));
  if (k >= 1) {
    t.posOffset = s.base;
    slides.delete(body);
    return;
  }
  s.offset.x = (s.base?.x ?? 0) * k;
  s.offset.z = (s.base?.z ?? 0) * k;
  s.offset.y = park.y + ((s.base?.y ?? 0) - park.y) * k;
}

export const PositionSlideSystem: ISystemFactory = world => {
  const balls = world.with('ball', 'transform');

  function update(dt: number): void {
    for (const [body, s] of slides) {
      const t = body.transform;
      if (!t) {
        slides.delete(body);
        continue;
      }
      if (s.park) {
        stepPark(body, t, s, s.park);
        continue;
      }
      s.ticks += dt * REFERENCE_FPS;
      if (s.ticks >= SLIDE_TICKS) {
        if (s.stops) stop(body);
        if (s.corner) {
          s.offset.x = 0;
          s.offset.z = 0;
          s.park = { x: t.pos.x, z: t.pos.z, y: s.offset.y };
          continue;
        }
        t.posOffset = s.base;
        slides.delete(body);
        continue;
      }
      const rest = Math.pow(s.keep, s.ticks);
      const dx = s.fromX * rest;
      const dz = s.fromZ * rest;
      s.offset.x = s.goalX + dx;
      s.offset.z = s.goalZ + dz;
      // `Position[2] = RequestTerrainHeight(...)` on the ground under it; Chaos Castle keeps its height.
      if (!s.corner) s.offset.y = (s.base?.y ?? 0) + world.getTerrainHeight(t.pos.x + dx, t.pos.z + dz) - t.pos.y;
    }

    // The ball (ZzzCharacter.cpp:3192-3203), every tick: it falls 6 cm a tick onto a floor 30 cm up and
    // bounces off it at 0.4, which never quite settles (a hop of a few cm); the roll fades by 0.8 a tick.
    for (const body of balls) {
      const b = body.ball;
      b.ticks += dt * REFERENCE_FPS;
      for (; b.ticks >= 1; b.ticks--) {
        b.height += b.gravity;
        b.gravity -= 6;
        if (b.height < 0) {
          b.height = 0;
          b.gravity = -b.gravity * 0.4;
        }
        body.transform.rot.x += b.spinX * RAD;
        body.transform.rot.z += b.spinZ * RAD;
        b.spinX = Math.abs(b.spinX) < 0.01 ? 0 : b.spinX * 0.8;
        b.spinZ = Math.abs(b.spinZ) < 0.01 ? 0 : b.spinZ * 0.8;
      }
      if (body.modelObject) body.modelObject.HoverHeight = (30 + b.height) * CM;
    }
  }
  return { update };
};
