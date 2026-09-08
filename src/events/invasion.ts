import { observable, runInAction } from 'mobx';
import { Vector3 } from '../libs/babylon/exports';
import type { ENUM_WORLD } from '../common/types';
import { EventBus } from '../libs/eventBus';
import {
  MapEventStatePacket,
} from '../common/packets/ServerToClientPackets';
import { devQueryNumber } from '../common/devSeams';
import { effects } from '../effects';
import { FIRE_PUFF, MODEL, RGBS } from '../effects/recipes';
import { lighting } from '../lighting';
import { ember } from '../lighting/recipes';
import { playSfx } from '../libs/sfx';
import { Store } from '../store';
import type { EventLayer } from './layer';

/**
 * The sky while a dragon invasion runs. `MapEventState` (0x0B) sets the
 * original's `EnableEvent` (ReceiveEvent, WSclient.cpp:6726: 1 Red Dragon,
 * 3 Golden Dragon) and, while it is set, `MoveBoids` (GOBoid.cpp:1206-1223)
 * does three things: it streaks MODEL_FIRE sub3 meteors over the hero with
 * SOUND_METEORITE01, it subtracts light from the terrain in a 16-tile disc
 * that follows them, and it fills the boid slots with dragons instead of the
 * map's own birds.
 *
 * The meteors and the dim are here. The dragons are a boid species
 * (`common/boids.ts`, `ecs/systems/boidSystem.ts`), which is where the
 * original keeps them and which is why they roar from over there and not from
 * this file. The banner text stays in `matchNotices.ts`.
 */

// ---- 1. tuning -------------------------------------------------------------

/** `rand_fps_check(40)` at 25 ticks/s: a meteor about every 1.6 s. */
const METEOR_CHANCE_PER_SECOND = 25 / 40;

/**
 * MODEL_FIRE sub3 (ZzzEffect.cpp:2659-2665): Dir(0,-12,0) doubled half the
 * frames (:17969) - 12 u/tick * 1.5 = 4.5 tiles/s for LifeTime 80 ticks.
 */
const METEOR_SPEED = 4.5;
const METEOR_SECONDS = 80 / 25;
const METEOR_SCALE = 0.3;

/** Spawn box off the hero (MU rand%600-200, rand%400+200, +300 - :1212-1214). */
const METEOR_X = [-2, 4] as const;
const METEOR_Z = [2, 6] as const;
const METEOR_HEIGHT = 3;

/**
 * Ours. The original's meteor throws no light - no MODEL_FIRE path calls
 * AddTerrainLight - it just reads as one because everything under it has been
 * darkened. The clone dims the same way (`lighting` omen below) and this is
 * what the room is made for: a small travelling ember so the ground under a
 * passing meteor moves, at the pool priority every event light takes.
 */
const METEOR_LIGHT_TILES = 4;

/** MODEL_FIRE's `o->BlendMesh = 1`: additive tail over an opaque lava core. */
const FIRE_BLEND_MESH = 1;

// ---- 2. state + readers ----------------------------------------------------

const state = observable(
  {
    /**
     * 0 none, else the `MapEventStateEventsEnum` value the server lit. Dev
     * seam `?invasion=1` (Red) / `?invasion=3` (Golden): the event is
     * server-driven and there is otherwise no way to stand in one to look at
     * it, which the screenshot runs need.
     */
    event: devQueryNumber('invasion') ?? 0,
  },
  {},
  { deep: false }
);

/** The invasion the server has lit: 0 none, 1 Red Dragon, 3 Golden Dragon. */
export function invasionEvent(): number {
  return state.event;
}

/** MoveBoids' meteor pass, one roll per frame. */
function update(_map: ENUM_WORLD, dt: number): void {
  // Asserted every frame rather than on the packet: a new scene builds a new
  // look director, and an invasion that started before it must still be lit.
  // `setOmen` is a no-op when nothing changed.
  lighting.omen(state.event ? 'invasion' : null);

  if (!state.event) return;
  const world = Store.world;
  const hero = world?.playerEntity;
  if (!world || !hero) return;
  const pos = hero.transform.pos;

  if (Math.random() < dt * METEOR_CHANCE_PER_SECOND) {
    const x = pos.x + METEOR_X[0] + Math.random() * (METEOR_X[1] - METEOR_X[0]);
    const z = pos.z + METEOR_Z[0] + Math.random() * (METEOR_Z[1] - METEOR_Z[0]);
    const from = new Vector3(x, world.getTerrainHeight(x, z) + METEOR_HEIGHT, z);
    // Straight along -z at spawn height, expiring in the air like sub3 does.
    const to = from.add(new Vector3(0, 0, -METEOR_SPEED * METEOR_SECONDS));
    effects.spawn('projectile', world.scene, from, {
      to,
      speed: METEOR_SPEED,
      model: { model: MODEL.fire, colour: RGBS.fire, scale: METEOR_SCALE, blendMesh: FIRE_BLEND_MESH },
      trail: { recipe: FIRE_PUFF, rate: 30 },
    });
    lighting.flash(
      world.scene,
      ember(METEOR_LIGHT_TILES, METEOR_SECONDS),
      { position: from.clone(), travel: { to, speed: METEOR_SPEED } }
    );
    playSfx('Sound/eMeteorite', from);
  }
}

// `EnableEvent` survives a warp in the original; nothing to drop on reset.

// ---- packets ---------------------------------------------------------------

EventBus.on('MapEventState', packet => {
  const p = new MapEventStatePacket(packet);
  runInAction(() => {
    state.event = p.Enable ? p.Event : 0;
  });
});

// ---- 3. the layer ----------------------------------------------------------

export const invasionLayer: EventLayer = {
  name: 'invasion',
  update,
  state: () => ({ open: false, running: state.event !== 0 }),
};
