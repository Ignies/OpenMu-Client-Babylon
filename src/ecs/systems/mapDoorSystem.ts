import { ENUM_WORLD } from '../../common/types';
import { playSfx } from '../../libs/sfx';
import type { Entity, ISystemFactory } from '../world';

/**
 * Proximity doors (MoveObject, ZzzObject.cpp:3871-3913). Devias has two
 * kinds: hinged doors (types 20 / 65 / 88) swing open around their model
 * pivot, the gate (type 86) slides sideways. Both react only to the hero:
 * inside 200 MU units (2 tiles) the door opens in proportion to the distance,
 * outside it turns back (TurnAngle2, 10°/tick) and slides home (×0.2/tick).
 * The original keys the table off the rest angle stored at CreateObject
 * (ZzzObject.cpp:4663: `HeadAngle` = angle, `HeadTargetAngle` = position).
 */

type DoorKind = 'hinged' | 'sliding';

const DOORS: Partial<Record<ENUM_WORLD, Record<number, DoorKind>>> = {
  [ENUM_WORLD.WD_2DEVIAS]: {
    20: 'hinged',
    65: 'hinged',
    88: 'hinged',
    86: 'sliding',
  },
};

/** Hero distance (MU units) inside which a door reacts. */
const OPEN_RANGE = 200;
/** TurnAngle2 step per 25 Hz tick while closing, degrees. */
const CLOSE_TURN_PER_TICK = 10;
/** Position lerp towards the rest position per tick while closing. */
const CLOSE_SLIDE_PER_TICK = 0.2;

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

interface DoorState {
  kind: DoorKind;
  /** Rest position in MU units (HeadTargetAngle). */
  homeX: number;
  homeY: number;
  /** Rest yaw in degrees, 0..360 (HeadAngle[2]). */
  homeAngle: number;
  /** Current yaw in degrees (Angle[2]). */
  angle: number;
  open: boolean;
}

function normalizeDegrees(angle: number): number {
  angle %= 360;
  return angle < 0 ? angle + 360 : angle;
}

/** TurnAngle2 (ZzzAI.cpp:112): step `current` towards `target` by at most `maxDelta`. */
function turnAngle2(current: number, target: number, maxDelta: number): number {
  if (maxDelta <= 0) return normalizeDegrees(current);
  let delta = normalizeDegrees(target) - normalizeDegrees(current);
  if (delta > 180) delta -= 360;
  else if (delta < -180) delta += 360;
  delta = Math.max(-maxDelta, Math.min(maxDelta, delta));
  return normalizeDegrees(current + delta);
}

export const MapDoorSystem: ISystemFactory = world => {
  const query = world.with('modelId', 'worldIndex', 'transform');
  const states = new WeakMap<Entity, DoorState>();

  function stateOf(e: Entity, kind: DoorKind): DoorState {
    let state = states.get(e);
    if (state) return state;

    const t = e.transform!;
    // `(int)Angle[2] % 360` — rest yaws are multiples of 90 in the map data.
    const homeAngle = normalizeDegrees(Math.trunc(t.rot.y * DEG));
    state = {
      kind,
      homeX: t.pos.x * world.terrainScale,
      homeY: t.pos.z * world.terrainScale,
      homeAngle,
      angle: homeAngle,
      open: false,
    };
    states.set(e, state);
    return state;
  }

  return {
    update: dt => {
      const table = DOORS[world.mapIndex];
      if (!table) return;

      const hero = world.playerEntity;
      if (!hero) return;

      const ht = hero.transform;
      const heroX = (ht.pos.x + (ht.posOffset?.x ?? 0)) * world.terrainScale;
      const heroY = (ht.pos.z + (ht.posOffset?.z ?? 0)) * world.terrainScale;
      const ticks = Math.min(1, dt * 25);

      for (const e of query) {
        if (e.worldIndex !== world.mapIndex) continue;
        const kind = table[e.modelId];
        if (!kind) continue;

        const s = stateOf(e, kind);
        const t = e.transform;

        const dx = heroX - s.homeX;
        const dy = heroY - s.homeY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let x = t.pos.x * world.terrainScale;
        let y = t.pos.z * world.terrainScale;

        if (distance < OPEN_RANGE) {
          const push = OPEN_RANGE - distance;

          if (kind === 'sliding') {
            if (s.homeAngle === 90) y = s.homeY + push * 2;
            else if (s.homeAngle === 270) y = s.homeY - push * 2;
            else if (s.homeAngle === 0) x = s.homeX + push * 2;
            else if (s.homeAngle === 180) x = s.homeX - push * 2;
          } else {
            if (s.homeAngle === 90) s.angle = 30 - push * 0.5;
            else if (s.homeAngle === 270) s.angle = 330 + push * 0.5;
            else if (s.homeAngle === 0) s.angle = 300 - push * 0.5;
            else if (s.homeAngle === 180) s.angle = 240 + push * 0.5;
          }

          if (!s.open) {
            s.open = true;
            // SOUND_DOOR02 (aCastleDoor) for the gate, SOUND_DOOR01 (aDoor) otherwise.
            playSfx(
              kind === 'sliding' ? 'Sound/aCastleDoor' : 'Sound/aDoor',
              { x: t.pos.x, z: t.pos.z }
            );
          }
        } else {
          s.angle = turnAngle2(s.angle, s.homeAngle, CLOSE_TURN_PER_TICK * ticks);
          const k = Math.min(1, CLOSE_SLIDE_PER_TICK * ticks);
          x += (s.homeX - x) * k;
          y += (s.homeY - y) * k;
          s.open = false;
        }

        t.pos.x = x / world.terrainScale;
        t.pos.z = y / world.terrainScale;
        t.rot.y = s.angle * RAD;
      }
    },
  };
};
