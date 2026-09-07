import type { WeatherLayer } from './layer';
import {
  Constants,
  RawTexture,
  Texture,
  Vector3,
  type Scene,
} from '../libs/babylon/exports';
import type { ThinEngine } from '@babylonjs/core/Engines/thinEngine';
import { GameOptions } from '../common/gameOptions';
import { effects } from '../effects';
import { FIRE_SPARKS, FLAME_TONGUES } from '../effects/recipes';
import type { ParticleRecipe } from '../effects/core';

/**
 * Grass that has been set on fire, and the fire still doing it.
 *
 * Two things in one file because they are one thing: the fires are the only
 * writer of the scar, and the scar is the only record the fires leave.
 *
 * A scar is not round and it is not bounded. A fight that moves leaves a
 * wandering burnt path, and a fire that spreads leaves a blot with a shape of
 * its own, so this is `snowTrail`'s world-space map rather than `snowMelt`'s
 * pool of circles: one byte per texel, stamped as the fire passes, uploaded
 * over a dirty rectangle rather than whole, and decayed by a pass that walks
 * only what has been painted.
 *
 * A leaf, on purpose. `terrainOverlay.ts` imports `snowMelt.ts` and
 * `snowCover.ts` imports `terrainOverlay.ts`, and naming another weather
 * module at module scope from inside that cycle has already crashed the client
 * on load once (`snowMelt.ts:33-43`). Nothing here imports the grass; the
 * grass imports this, and hands its own "does anything grow at this point"
 * back through `setGrassProbe`.
 *
 * Local, and it does not pretend otherwise. Two players watching the same
 * fireball see different scars. A burn is a function of what somebody did
 * rather than of the clock, so the `ambientSchedule` trick - world state as a
 * pure function of `serverNow()` - does not reach it, and the protocol carries
 * no timestamp for an impact today (`serverTime.ts:9-11`). `snowMelt` and
 * `snowTrail` are both local for the same reason.
 */

// ---- 1. tuning -------------------------------------------------------------

/**
 * Texels per tile. Four puts a texel at 25 cm, finer than a blade is tall.
 * The edge gets its raggedness from the per-blade hash in the shader, not from
 * this, so there is nothing to buy by going higher: 1024x1024 is one megabyte
 * against `snowTrail`'s four.
 */
export const BURN_RES = 4;

/** Side of the burn map in texels. */
export const BURN_SIZE = 256 * BURN_RES;

/**
 * Seconds for a full burn to grow back. The ask was "at least five minutes",
 * and `snowTrail` next door has been running a 240-second fill on the same
 * machinery, so this is a proven shape at a longer setting.
 */
const REGROW_SECONDS = 300;

/** Seconds between decay passes; each walks the painted rectangle. */
const DECAY_EVERY = 2;

/** Fires alight at once. Past a handful they overlap into one blaze anyway. */
const MAX_FIRES = 6;

/**
 * How fast a front travels at full vigour, in tiles a second, and how fast
 * spreading costs it that vigour.
 *
 * The second is the whole of "it should die down the more it spreads": vigour
 * falls at `radius / VIGOUR_SPAN`, so a fire that has got somewhere is a fire
 * that is going out, and the further it has got the faster it goes out. A
 * fireball's 1.2-tile hit reaches about four tiles before it gives up;
 * Hellfire's 2.6 reaches further because it starts further, with no special
 * case anywhere to say so.
 */
const SPREAD_RATE = 0.9;
const VIGOUR_SPAN = 9;

/** Past this a front is done however much vigour is left. */
const FIRE_MAX_RADIUS = 7;

/** Vigour lost per second where the ring finds nothing to burn. */
const STARVE_RATE = 2.5;

/** Points sampled around a ring to ask whether there is still fuel. */
const FUEL_SAMPLES = 8;

/**
 * Seconds between ember bursts from one front, and sparks a burst.
 *
 * Per front, which is what makes the rate matter: six fires at four sparks
 * every eighth of a second is two hundred a second, and at any distance that
 * stops being embers and becomes a pale haze hanging over the field. The
 * texture and the size were right all along - it was the count.
 */
const EMBER_EVERY = 0.3;
const EMBER_SPARKS = 3;

/** Tongues of flame per burst, standing up out of the blades on the ring. */
const FLAME_TONGUES_PER_BURST = 3;

/**
 * The ember off burning grass.
 *
 * `FIRE_SPARKS` is the skills' own, sized for a fireball going off at chest
 * height, and at a third of a tile it lies in the grass like an orange brick.
 * Same texture and the same colours, a third of the size, and it falls rather
 * than flying: this comes off a blade, not out of an explosion.
 */
const GRASS_EMBERS: ParticleRecipe = {
  ...FIRE_SPARKS,
  size: 0.05,
  sizeJitter: 0.02,
  life: 0.9,
  power: 0.7,
  gravity: -1.2,
};

/** How black a texel goes when the fire passes over it. */
const CHAR = 255;

// ---- 2. state --------------------------------------------------------------

/** A texel rectangle, inclusive; `x0 > x1` means empty. */
type Rect = { x0: number; z0: number; x1: number; z1: number };

const emptyRect = (r: Rect): Rect => {
  r.x0 = BURN_SIZE;
  r.z0 = BURN_SIZE;
  r.x1 = -1;
  r.z1 = -1;
  return r;
};
const rectEmpty = (r: Rect): boolean => r.x1 < r.x0 || r.z1 < r.z0;
const growRect = (r: Rect, x0: number, z0: number, x1: number, z1: number) => {
  if (x0 < r.x0) r.x0 = x0;
  if (z0 < r.z0) r.z0 = z0;
  if (x1 > r.x1) r.x1 = x1;
  if (z1 > r.z1) r.z1 = z1;
};

/** A fire front: where it started, how far it has got, how much is left. */
type Fire = {
  x: number;
  z: number;
  /** Tiles from the centre the flame edge has reached. */
  radius: number;
  /** Tiles already burnt; the annulus between the two is what gets stamped. */
  burnt: number;
  vigour: number;
  sinceEmber: number;
};

const fires: Fire[] = [];

/** The scar; allocated on the first burn. */
let data: Uint8Array | null = null;

/** Scratch for the sub-rect upload, grown to the largest rect seen. */
let upload: Uint8Array = new Uint8Array(0);

let texture: RawTexture | null = null;
let sinceDecay = 0;
/** Fractional bytes of regrowth the clock owes but has not spent yet. */
let owed = 0;

/** The scene the last ignition came from; the embers are drawn into it. */
let emberScene: Scene | null = null;

/** Texels written since the last upload. */
const dirty: Rect = emptyRect({ x0: 0, z0: 0, x1: 0, z1: 0 });
/** Every texel that may be non-zero; what the decay walks. */
const painted: Rect = emptyRect({ x0: 0, z0: 0, x1: 0, z1: 0 });

/**
 * Does grass grow here? Handed over by the grass field rather than asked of
 * it, so this module stays a leaf - see the header.
 *
 * Null before a field exists, which reads as "burn anywhere": a fire lit
 * during a warp is not worth a special case, and the scar it leaves is
 * invisible until the grass it is masking exists.
 */
let grassProbe: ((x: number, z: number) => boolean) | null = null;

export function setGrassProbe(fn: ((x: number, z: number) => boolean) | null): void {
  grassProbe = fn;
}

const hasFuel = (x: number, z: number): boolean => !grassProbe || grassProbe(x, z);

/**
 * The ground under a point. Handed over with the grass probe rather than
 * looked up, for the same leaf reason.
 */
let heightProbe: ((x: number, z: number) => number) | null = null;

export function setGroundProbe(fn: ((x: number, z: number) => number) | null): void {
  heightProbe = fn;
}

const groundAt = (x: number, z: number): number => (heightProbe ? heightProbe(x, z) : 0);

function ensureData(): Uint8Array {
  if (!data) data = new Uint8Array(BURN_SIZE * BURN_SIZE);
  return data;
}

/** The scar as a texture, created on first use for this scene. */
export function grassBurnTexture(scene: Scene): RawTexture {
  if (texture && texture.getScene() === scene) return texture;

  // Allocated here rather than left null until the first fire.
  //
  // `snowTrail` gets away with a null-backed texture because nothing asks it
  // for one until something has been ploughed. This one is bound by the
  // terrain and the grass on the very first frame, so it would be created
  // empty, and a texture Babylon was given no storage for is not one that a
  // later `updateTextureData` can fill: every burn wrote into the CPU array,
  // the uploads all reported success, and the shader sampled zero for ever.
  // One megabyte of zeroes on a map that has grass, against that.
  texture = RawTexture.CreateRTexture(
    ensureData(),
    BURN_SIZE,
    BURN_SIZE,
    scene,
    false,
    false,
    Texture.BILINEAR_SAMPLINGMODE,
    // The type, and it has to be said.
    //
    // `CreateRTexture` defaults to `TEXTURETYPE_FLOAT`, so a texture handed a
    // `Uint8Array` is allocated as float and every byte written into it goes
    // nowhere - silently. Everything else looked right the whole time: the CPU
    // scar had 1.0 in it, `terrainBurnOn` bound as 1, the sampler bound the
    // right texture by name, `updateTextureData` returned without complaint,
    // and reading the texture back gave 1048576 zeroes. Only the embers ever
    // showed, because the embers are the one part of this that does not read
    // the map.
    Constants.TEXTURETYPE_UNSIGNED_INT
  );
  texture.name = 'grassBurn';
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.onDisposeObservable.addOnce(() => {
    texture = null;
  });

  // A fresh texture holds nothing: whatever is painted must go up whole.
  if (!rectEmpty(painted)) {
    growRect(dirty, painted.x0, painted.z0, painted.x1, painted.z1);
  }

  return texture;
}

/** Whether anything is burnt or burning, so the shader can skip the fetch. */
export function grassBurnActive(): boolean {
  return !rectEmpty(painted) || fires.length > 0;
}

/** How burnt this point is, 0..1. The CPU's copy of what the shader reads. */
export function grassBurnAt(x: number, z: number): number {
  if (!data) return 0;

  const tx = Math.floor(x * BURN_RES);
  const tz = Math.floor(z * BURN_RES);

  if (tx < 0 || tz < 0 || tx >= BURN_SIZE || tz >= BURN_SIZE) return 0;

  return data[tz * BURN_SIZE + tx] / 255;
}

// ---- 3. burning ------------------------------------------------------------

/**
 * Stamp the annulus between `from` and `to` tiles of a fire's centre.
 *
 * The annulus and not the disc: the inside is already burnt, and re-stamping
 * it would keep resetting its regrowth clock, so a fire that spread for four
 * seconds would leave a scar that recovers all at once instead of from the
 * outside in.
 */
function stamp(fire: Fire, from: number, to: number): void {
  const map = ensureData();

  const x0 = Math.max(0, Math.floor((fire.x - to) * BURN_RES));
  const x1 = Math.min(BURN_SIZE - 1, Math.ceil((fire.x + to) * BURN_RES));
  const z0 = Math.max(0, Math.floor((fire.z - to) * BURN_RES));
  const z1 = Math.min(BURN_SIZE - 1, Math.ceil((fire.z + to) * BURN_RES));

  if (x1 < x0 || z1 < z0) return;

  const inner = from * from;
  const outer = to * to;
  let touched = false;

  for (let tz = z0; tz <= z1; tz++) {
    const wz = (tz + 0.5) / BURN_RES;
    const dz = wz - fire.z;
    const row = tz * BURN_SIZE;

    for (let tx = x0; tx <= x1; tx++) {
      const wx = (tx + 0.5) / BURN_RES;
      const dx = wx - fire.x;
      const d2 = dx * dx + dz * dz;

      if (d2 < inner || d2 > outer) continue;
      if (!hasFuel(wx, wz)) continue;

      const i = row + tx;

      // Written with `max`, so a second fire over the same ground does not
      // stack past black and does not shorten what is already there.
      if (map[i] >= CHAR) continue;

      map[i] = CHAR;
      touched = true;
    }
  }

  if (!touched) return;

  growRect(dirty, x0, z0, x1, z1);
  growRect(painted, x0, z0, x1, z1);
}

/** Is there anything left to burn around this ring? */
function ringHasFuel(fire: Fire): boolean {
  for (let i = 0; i < FUEL_SAMPLES; i++) {
    const a = (i / FUEL_SAMPLES) * Math.PI * 2;

    if (hasFuel(fire.x + Math.cos(a) * fire.radius, fire.z + Math.sin(a) * fire.radius)) {
      return true;
    }
  }

  return false;
}

/**
 * Set the grass alight. `radius` in tiles is the hit itself; the fire spreads
 * from there under its own vigour.
 *
 * Called by the fire rows of `common/skillVisuals.ts` through the same step
 * list that melts snow, so every fire skill in the game reaches it and any
 * added later does too.
 */
export function burnGrass(
  scene: Scene,
  x: number,
  z: number,
  radius: number,
  strength = 1
): void {
  if (!GameOptions.advancedEffects) return;
  if (!hasFuel(x, z)) return;

  emberScene = scene;

  // A hit inside a fire that is already going feeds it rather than starting a
  // second one on top - otherwise a channelled spell stacks six fronts on one
  // spot and they all spread together as a wall.
  for (const f of fires) {
    if (Math.hypot(f.x - x, f.z - z) <= f.radius) {
      f.vigour = Math.max(f.vigour, strength);
      return;
    }
  }

  const fire: Fire = {
    x,
    z,
    radius,
    burnt: 0,
    vigour: strength,
    sinceEmber: 0,
  };

  // Full: the one with least left to give makes way.
  if (fires.length >= MAX_FIRES) {
    let worst = 0;
    for (let i = 1; i < fires.length; i++) {
      if (fires[i].vigour < fires[worst].vigour) worst = i;
    }
    fires.splice(worst, 1);
  }

  stamp(fire, 0, radius);
  fire.burnt = radius;
  fires.push(fire);
}

/** Embers off the flame edge, where the fire actually is. */
function embers(fire: Fire, dt: number): void {
  const scene = emberScene;

  if (!scene) return;

  fire.sinceEmber += dt;

  if (fire.sinceEmber < EMBER_EVERY) return;

  fire.sinceEmber = 0;

  // On the ring, not over the scar. A burnt patch that keeps throwing sparks
  // for five minutes is a bonfire, not something that has been burnt.
  const a = Math.random() * Math.PI * 2;
  const x = fire.x + Math.cos(a) * fire.radius;
  const z = fire.z + Math.sin(a) * fire.radius;

  if (!hasFuel(x, z)) return;

  const at = new Vector3(x, groundAt(x, z), z);

  // The flame front itself, which is the thing that was missing. Sparks alone
  // are what a fire leaves behind, not what it looks like: with only embers
  // in the air there was nothing burning anywhere on screen, just some orange
  // chips over ordinary grass. The tongues stand up out of the blades along
  // the ring and travel with it.
  effects.spawn('particles', scene, at, {
    recipe: FLAME_TONGUES,
    count: FLAME_TONGUES_PER_BURST,
  });

  // And the embers off it. `GRASS_EMBERS` rather than `FIRE_SPARKS`: the
  // skills' own spark is sized for a fireball going off at chest height and
  // is far too big for something coming off burning grass, where it reads as
  // an orange brick lying in the field.
  effects.spawn('particles', scene, at, {
    recipe: GRASS_EMBERS,
    count: EMBER_SPARKS,
  });
}

// ---- 4. the clock ----------------------------------------------------------

/**
 * Grow the scar back by `amount` (of 255) over the painted rectangle, then
 * shrink the rectangle to what is still burnt.
 */
function decay(amount: number): void {
  if (!data || rectEmpty(painted)) return;

  const { x0, z0, x1, z1 } = painted;
  growRect(dirty, x0, z0, x1, z1);

  let nx0 = BURN_SIZE;
  let nz0 = BURN_SIZE;
  let nx1 = -1;
  let nz1 = -1;

  for (let tz = z0; tz <= z1; tz++) {
    const row = tz * BURN_SIZE;
    for (let tx = x0; tx <= x1; tx++) {
      const i = row + tx;
      const v = data[i];
      if (v === 0) continue;
      const n = v > amount ? v - amount : 0;
      data[i] = n;
      if (n === 0) continue;
      if (tx < nx0) nx0 = tx;
      if (tx > nx1) nx1 = tx;
      if (tz < nz0) nz0 = tz;
      if (tz > nz1) nz1 = tz;
    }
  }

  painted.x0 = nx0;
  painted.z0 = nz0;
  painted.x1 = nx1;
  painted.z1 = nz1;
}

/** `texSubImage2D` of the dirty rectangle only. */
function flush(): void {
  if (rectEmpty(dirty) || !texture || !data) return;

  const internal = texture.getInternalTexture();
  const engine = texture.getScene()?.getEngine() as ThinEngine | undefined;
  if (!internal || !engine || !internal.isReady) return;

  const { x0, z0, x1, z1 } = dirty;
  const w = x1 - x0 + 1;
  const h = z1 - z0 + 1;

  if (upload.length < w * h) upload = new Uint8Array(w * h);
  for (let tz = 0; tz < h; tz++) {
    const src = (z0 + tz) * BURN_SIZE + x0;
    upload.set(data.subarray(src, src + w), tz * w);
  }

  engine.updateTextureData(internal, upload.subarray(0, w * h), x0, z0, w, h);

  emptyRect(dirty);
}

function update(dt: number): void {
  for (let i = fires.length - 1; i >= 0; i--) {
    const f = fires[i];

    f.radius += SPREAD_RATE * f.vigour * dt;

    // The whole of "it dies down the more it spreads". Distance travelled is
    // what costs the fire, so it slows as it goes and then stops.
    f.vigour -= (dt * f.radius) / VIGOUR_SPAN;

    // And it goes out where there is nothing left to take.
    if (!ringHasFuel(f)) f.vigour -= dt * STARVE_RATE;

    if (f.radius > f.burnt) {
      stamp(f, f.burnt, f.radius);
      f.burnt = f.radius;
    }

    embers(f, dt);

    if (f.vigour <= 0 || f.radius >= FIRE_MAX_RADIUS) fires.splice(i, 1);
  }

  if (!rectEmpty(painted)) {
    sinceDecay += dt;

    if (sinceDecay >= DECAY_EVERY) {
      // The fraction is carried rather than rounded away. A pass every two
      // seconds owes 255 * 2 / 300 = 1.7 of a byte, and rounding that to 2
      // regrows the field in 255 seconds instead of 300 - measured at 239,
      // against an ask that said five minutes at the least. Carrying the
      // remainder spends exactly what the clock owes.
      owed += (255 * sinceDecay) / REGROW_SECONDS;
      sinceDecay = 0;

      const amount = Math.floor(owed);

      if (amount >= 1) {
        decay(amount);
        owed -= amount;
      }
    }
  }

  flush();
}

/** Put every fire out and wipe the scar: a map change or a teardown. */
export function resetGrassBurn(): void {
  fires.length = 0;
  emberScene = null;

  if (data && !rectEmpty(painted)) {
    // Only the painted rectangle can hold anything, so only it is zeroed and
    // only it goes back up.
    for (let tz = painted.z0; tz <= painted.z1; tz++) {
      const row = tz * BURN_SIZE;
      data.fill(0, row + painted.x0, row + painted.x1 + 1);
    }
    growRect(dirty, painted.x0, painted.z0, painted.x1, painted.z1);
  }

  emptyRect(painted);
  owed = 0;
  sinceDecay = 0;
  flush();
}

// ---- 5. the layer ----------------------------------------------------------

export const grassBurnLayer: WeatherLayer = {
  name: 'grassBurn',
  update: (_map, dt) => update(dt),
  reset: resetGrassBurn,
};
