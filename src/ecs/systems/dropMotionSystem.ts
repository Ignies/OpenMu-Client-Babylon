import { ENUM_WORLD } from '../../common/types';
import { itemRestHeight, itemTumbleAxis } from '../../common/itemAngle';
import type { Entity, ISystemFactory } from '../world';

/**
 * How a dropped item moves (`MoveItems`, ZzzObject.cpp:6244; `CreateItem`
 * :6200; `RenderItems` :6394):
 *
 * - A **fresh** drop (`IsFreshDrop`) is created 180 cm up with
 *   `Gravity = 20` cm/tick and falls under `Gravity -= 6` a tick, tumbling
 *   — `Angle[0] = -Gravity × 10°` while airborne, `Angle[1]` for a shield —
 *   until it reaches its rest height, where `ItemAngle` sets the lying pose
 *   back (that pose is `common/itemAngle.ts`, applied at spawn). Here the
 *   fall is a render-only `posOffset.y` above the rest position logic.ts
 *   placed it at, so pathing, picking and the name tag never see it move.
 * - On Icarus (and Kanturu's Maya scene) every drop **bobs**:
 *   `Position[2] += 10 × sin((i × 1237 + WorldTime) × 0.002)`.
 *
 * Nothing here allocates per frame; a drop that is neither fresh nor on a
 * bobbing map costs one boolean.
 */

// ---- tuning ------------------------------------------------------------------

/** 25 Hz: the original's step. */
const TICKS_PER_SECOND = 25;

/** `Position[2] = terrain + 180` at creation, above the item's rest height. */
const START_HEIGHT_CM = 180;
/** `o->Gravity = 20.f`, cm per tick, upward. */
const START_VELOCITY_CM = 20;
/** `o->Gravity -= 6.f` a tick. */
const GRAVITY_CM = 6;
/**
 * `Angle[0] = -Gravity × 10` degrees while airborne. `transform.rot` negates
 * the original's pitch and roll (common/renderAngles.ts), so the rotation the
 * entity carries is `+Gravity × 10`.
 */
const TUMBLE_DEG_PER_CM = 10;

/** Maps whose drops bob. */
const BOB_MAPS: ReadonlySet<ENUM_WORLD> = new Set([ENUM_WORLD.WD_10ICARUS]);
/** `10 × sin(…)` cm. */
const BOB_CM = 10;
/** `WorldTime × 0.002` with WorldTime in ms: radians per second. */
const BOB_RATE = 2;
/** `i × 1237 × 0.002`: the per-drop phase, radians per index. */
const BOB_PHASE = 1237 * 0.002;

/**
 * Seconds a fresh drop waits for its model before the fall is written off.
 * A drop that spawns at the edge of the view range may never get one, and a
 * corpse's loot must not leap into the air a minute later when the hero
 * finally walks over to it.
 */
const FRESH_GRACE_SECONDS = 2;

const DEG = Math.PI / 180;
const CM = 1 / 100;

// ---- state -------------------------------------------------------------------

type Motion = {
  /** cm/tick, the original's `Gravity` field. */
  velocity: number;
  /** Fractional ticks carried between frames. */
  tickAcc: number;
  airborne: boolean;
  /** `ItemAngle`'s pose, to restore on landing. */
  restRotX: number;
  restRotZ: number;
  /** Which axis the tumble spins: `Angle[1]` for shields, `Angle[0]` otherwise. */
  tumbleAxis: 'x' | 'z';
  offset: { x: number; y: number; z: number };
};

export const DropMotionSystem: ISystemFactory = world => {
  const drops = world.with('droppedItem', 'transform');
  const motions = new Map<Entity, Motion>();
  /** When each still-modelless fresh drop was first seen (FRESH_GRACE_SECONDS). */
  const waiting = new Map<Entity, number>();

  drops.onEntityRemoved.subscribe(e => {
    motions.delete(e);
    waiting.delete(e);
  });

  function start(e: Entity, airborne: boolean): Motion {
    const t = e.transform!;
    const group = e.droppedItem!.group;
    // The drop already sits at its rest height; the fall starts at the
    // original's absolute +180 cm, which is that much *further* up.
    const above = START_HEIGHT_CM * CM - itemRestHeight(group);
    const offset = { x: 0, y: airborne ? Math.max(0, above) : 0, z: 0 };
    t.posOffset = offset;
    const m: Motion = {
      velocity: START_VELOCITY_CM,
      tickAcc: 0,
      airborne,
      restRotX: t.rot.x,
      restRotZ: t.rot.z,
      tumbleAxis: itemTumbleAxis(group),
      offset,
    };
    motions.set(e, m);
    return m;
  }

  return {
    update: dt => {
      const bob = BOB_MAPS.has(world.mapIndex);
      const now = world.gameTime.TotalGameTime.TotalSeconds;

      for (const e of drops) {
        const { droppedItem, transform } = e;
        let m = motions.get(e);
        // The model is built lazily, once the drop is close enough to matter
        // (ModelLoaderSystem), and the whole fall is over in half a second:
        // starting it on the packet meant every drop had already landed by
        // the time it had a mesh to see it with.
        if (!m && droppedItem.fresh) {
          if (e.modelObject?.Ready) {
            waiting.delete(e);
            m = start(e, true);
          } else {
            const since = waiting.get(e);
            if (since === undefined) waiting.set(e, now);
            else if (now - since > FRESH_GRACE_SECONDS) {
              droppedItem.fresh = false;
              waiting.delete(e);
            }
          }
        }

        if (m?.airborne) {
          m.tickAcc += dt * TICKS_PER_SECOND;
          while (m.tickAcc >= 1) {
            m.tickAcc -= 1;
            m.offset.y += m.velocity * CM;
            m.velocity -= GRAVITY_CM;
          }
          if (m.offset.y <= 0) {
            m.offset.y = 0;
            m.airborne = false;
            transform.rot.x = m.restRotX;
            transform.rot.z = m.restRotZ;
            droppedItem.fresh = false;
          } else {
            transform.rot[m.tumbleAxis] = m.velocity * TUMBLE_DEG_PER_CM * DEG;
          }
          continue;
        }

        if (!bob) continue;
        if (!m) m = start(e, false);
        m.offset.y = BOB_CM * CM * Math.sin((e.netId ?? 0) * BOB_PHASE + now * BOB_RATE);
      }
    },
  };
};
