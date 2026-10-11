import type { Entity, ISystemFactory } from '../world';
import type { IVector3Like } from '../../controllers/render/babylon/exports';
import { REFERENCE_FPS } from '../../controllers/anim/playSpeed';

/**
 * The server's instant move (`ObjectMoved`, C1 15) slides the body in. `ReceiveMovePosition` sets
 * `JumpTime = 1` (WSclient.cpp:2127-2153) and `PushingCharacter` (ZzzCharacter.cpp:3144-3190) moves
 * the body a fifth of the way to the new tile every 25 fps tick, on the ground, for 15 ticks, then
 * puts it there. The position lands at once here; `transform.posOffset` carries what is left.
 */

/** `Speed = 0.2f`: the share of the way left that one tick covers. */
const KEEP_PER_TICK = 0.8;
/** `JumpTime > 15`: the body is put on the tile. */
const SLIDE_TICKS = 15;

type Slide = {
  /** The offset the body had before (a character's tile centre), given back at the end. */
  base: IVector3Like | undefined;
  /** Where the body is drawn from, tiles from its new position, before the ease. */
  from: IVector3Like;
  /** The offset written while sliding. */
  offset: IVector3Like;
  ticks: number;
};

const slides = new Map<Entity, Slide>();

/** `body` was just put on its tile from (x, y, z): draw it sliding there. */
export function startPositionSlide(body: Entity, x: number, y: number, z: number): void {
  const t = body.transform;
  if (!t) return;

  // A slide still running carries on from where the body is drawn.
  const running = slides.get(body);
  const base = running ? running.base : t.posOffset;
  const bx = base?.x ?? 0;
  const by = base?.y ?? 0;
  const bz = base?.z ?? 0;
  const from = {
    x: x - t.pos.x + (running ? running.offset.x - bx : 0),
    y: y - t.pos.y,
    z: z - t.pos.z + (running ? running.offset.z - bz : 0),
  };
  if (from.x === 0 && from.z === 0) return;

  const offset = { x: bx + from.x, y: by + from.y, z: bz + from.z };
  slides.set(body, { base, from, offset, ticks: 0 });
  t.posOffset = offset;
}

export const PositionSlideSystem: ISystemFactory = world => {
  function update(dt: number): void {
    for (const [body, s] of slides) {
      const t = body.transform;
      s.ticks += dt * REFERENCE_FPS;
      if (!t || s.ticks >= SLIDE_TICKS) {
        if (t) t.posOffset = s.base;
        slides.delete(body);
        continue;
      }
      const rest = Math.pow(KEEP_PER_TICK, s.ticks);
      const dx = s.from.x * rest;
      const dz = s.from.z * rest;
      s.offset.x = (s.base?.x ?? 0) + dx;
      s.offset.z = (s.base?.z ?? 0) + dz;
      // `Position[2] = RequestTerrainHeight(...)`: on the ground under the body.
      s.offset.y = (s.base?.y ?? 0) + world.getTerrainHeight(t.pos.x + dx, t.pos.z + dz) - t.pos.y;
    }
  }
  return { update };
};
