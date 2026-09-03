import { observable, runInAction } from 'mobx';
import { Vector3 } from '../libs/babylon/exports';
import type { ENUM_WORLD } from '../common/types';
import { EventBus } from '../libs/eventBus';
import {
  MapEventStatePacket,
} from '../common/packets/ServerToClientPackets';
import { effects } from '../effects';
import { FIRE_PUFF, MODEL, RGBS } from '../effects/recipes';
import { playSfx } from '../libs/sfx';
import { Store } from '../store';
import type { EventLayer } from './layer';

/**
 * The sky while a dragon invasion runs. `MapEventState` (0x0B) sets the
 * original's `EnableEvent` (ReceiveEvent, WSclient.cpp:6726: 1 Red Dragon,
 * 3 Golden Dragon) and, while it is set, `MoveBoids` (GOBoid.cpp:1206-1223)
 * streaks MODEL_FIRE sub3 meteors over the hero with SOUND_METEORITE01, and
 * the dragons circling overhead roar SOUND_MONSTER_BULLATTACK1
 * (GOBoid.cpp:1411-1412). The dragon flyover itself (the boid MODEL_DRAGON_
 * pass) needs animation-clip control the model effect does not have, so only
 * its roar is kept, distant. The banner text stays in `matchNotices.ts`.
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
 * The original roars once per `rand_fps_check(128)` per circling dragon,
 * a few of which are usually up. Without the flyover the roars stay but
 * come sparser and from a distance.
 */
const ROAR_MEAN_SECONDS = 6;
const ROAR_TILES = [7, 14] as const;
const ROAR_GAIN = 0.7;

/** MODEL_FIRE's `o->BlendMesh = 1`: additive tail over an opaque lava core. */
const FIRE_BLEND_MESH = 1;

// ---- 2. state + readers ----------------------------------------------------

const state = observable(
  {
    /** 0 none, else the `MapEventStateEventsEnum` value the server lit. */
    event: 0,
  },
  {},
  { deep: false }
);

/** MoveBoids' meteor pass, one roll per frame. */
function update(_map: ENUM_WORLD, dt: number): void {
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
    playSfx('Sound/eMeteorite', from);
  }

  if (Math.random() < dt / ROAR_MEAN_SECONDS) {
    const angle = Math.random() * Math.PI * 2;
    const tiles = ROAR_TILES[0] + Math.random() * (ROAR_TILES[1] - ROAR_TILES[0]);
    const at = new Vector3(pos.x + Math.cos(angle) * tiles, pos.y, pos.z + Math.sin(angle) * tiles);
    playSfx('Sound/mBullAttack1', at, ROAR_GAIN);
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
