/**
 * Aura — a persistent effect that wraps a body until told to stop: the
 * Soul Barrier bubble, the elf buffs' orbiting motes, Swell Life's red
 * shimmer. The original keeps these in the character's `m_pEffect` slots and
 * re-draws them every frame while the buff flag is set
 * (ZzzCharacter.cpp `RenderCharacterEffect`: MODEL_SHIELD, BITMAP_SHINY orbit).
 *
 * Three optional parts, all following the same point: a particle stream
 * from a recipe, `orbit` cards circling at waist height, and one `shell`
 * card (a sphere-ish billboard) over the body. Lives until `stop()`.
 *
 * Driven by: `effects.spawn('aura', …)` from `common/skillVisuals.ts`'s buff
 * table (MagicEffectStatus). Read by: nobody.
 */
import { Vector3, type Scene } from '../libs/babylon/exports';
import {
  Emitter,
  LiveList,
  acquireCard,
  additiveMaterial,
  releaseCard,
  hash,
  type Card,
  type ParticleRecipe,
  type PointSource,
  type RGB,
} from './core';
import { RGBS } from './recipes';
import { spawnJoint } from './joint';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Orbit radius in tiles: just outside the body. */
const ORBIT_RADIUS = 0.45;

/** Orbit height above the feet: the waist. */
const ORBIT_HEIGHT = 0.7;

/** Orbit speed, radians/s: one lap in ~2 s like the original's `Angle += 3` per tick. */
const ORBIT_SPEED = Math.PI;

/** Shell height: the chest, where MODEL_SHIELD is centred. */
const SHELL_HEIGHT = 0.8;

/** Shell breathing: ±8 % scale at 2 Hz. */
const SHELL_PULSE = 0.08;
const SHELL_PULSE_HZ = 2;

/** Fade in/out so a buff does not pop. */
const RAMP_SECONDS = 0.3;

/** Ribbon orbit: the spear-skill joints circle at 1 tile and rise the body's height... */
const RIBBON_RADIUS = 0.6;
const RIBBON_HEIGHT = 0.9;
/** ...twice as fast as the shiny orbit so the tails stretch into a band. */
const RIBBON_SPEED = Math.PI * 2;
/** Vertical bob of the ribbon heads: ±0.4 tiles at half the orbit rate. */
const RIBBON_BOB = 0.4;
/** Default ribbon width (C++ Scale 20 = 20 cm) and tail count (MaxTails 30). */
const RIBBON_WIDTH = 0.2;
const RIBBON_TAILS = 30;

// ---- 2. state + readers ----------------------------------------------------

export interface AuraOptions {
  follow: PointSource;
  /** Particle shimmer over the body. */
  stream?: { recipe: ParticleRecipe; rate: number; height?: number };
  /** Cards circling the waist. */
  orbit?: { texture: string; colour?: RGB; count: number; size?: number; radius?: number; height?: number };
  /** Ends the aura on its own when true (the wearer left the world). */
  until?: () => boolean;
  /** One card over the chest. */
  shell?: { texture: string; colour?: RGB; size: number; height?: number; spin?: number };
  /**
   * Ribbons whose heads orbit the body, tails trailing (the original's five
   * MODEL_SPEARSKILL joints with LT 999999 on a Soul Barrier / Greater
   * Defense). `width` = C++ Scale in tiles, `tails` = MaxTails.
   */
  ribbons?: { count: number; colour?: RGB; width?: number; tails?: number; radius?: number; height?: number; speed?: number };
}

const live = new LiveList();

/** How many auras are up (debug). */
export function auraCount(): number {
  return live.size;
}

const tmp = new Vector3();
let seed = 0;

function spawn(scene: Scene, _at: Vector3, opts: AuraOptions): EffectHandle {
  const stream = opts.stream ? new Emitter(scene, opts.stream.recipe, opts.stream.rate) : null;
  const streamHeight = opts.stream?.height ?? 0;

  const orbit: Card[] = [];
  const orbitRadius = opts.orbit?.radius ?? ORBIT_RADIUS;
  const orbitHeight = opts.orbit?.height ?? ORBIT_HEIGHT;
  const orbitSize = opts.orbit?.size ?? 0.25;
  if (opts.orbit) {
    const m = additiveMaterial(scene, opts.orbit.texture, opts.orbit.colour ?? RGBS.holy);
    for (let i = 0; i < opts.orbit.count; i++) orbit.push(acquireCard(scene, m));
  }

  let shell: Card | null = null;
  const shellHeight = opts.shell?.height ?? SHELL_HEIGHT;
  const shellSpin = opts.shell?.spin ?? 0;
  if (opts.shell) {
    shell = acquireCard(scene, additiveMaterial(scene, opts.shell.texture, opts.shell.colour ?? RGBS.soul));
  }

  const phase = hash(seed++) * Math.PI * 2;
  let t = 0;
  let stopping = false;
  let ramp = 0;

  // Persistent orbit ribbons: trail joints whose heads we drive from here.
  const ribbons: EffectHandle[] = [];
  if (opts.ribbons) {
    const r = opts.ribbons;
    const radius = r.radius ?? RIBBON_RADIUS;
    const height = r.height ?? RIBBON_HEIGHT;
    const speed = r.speed ?? RIBBON_SPEED;
    const anchor = new Vector3();
    for (let i = 0; i < r.count; i++) {
      const offset = (i * Math.PI * 2) / r.count;
      const head: PointSource = out => {
        opts.follow(anchor);
        const ang = phase + offset + speed * t;
        return out.set(
          anchor.x + Math.cos(ang) * radius,
          anchor.y + height + Math.sin(ang * 0.5 + offset) * RIBBON_BOB,
          anchor.z + Math.sin(ang) * radius
        );
      };
      ribbons.push(
        spawnJoint(scene, anchor, {
          head,
          maxTails: r.tails ?? RIBBON_TAILS,
          width: r.width ?? RIBBON_WIDTH,
          colour: r.colour ?? RGBS.white,
          seconds: Infinity,
          until: () => stopping,
        })
      );
    }
  }

  const fx = live.push({
    update(dt) {
      t += dt;
      ramp += (stopping ? -dt : dt) / RAMP_SECONDS;
      if (ramp > 1) ramp = 1;
      if (ramp <= 0) return false;
      if (!stopping && opts.until?.()) stopping = true;
      opts.follow(tmp);
      if (stream && !stopping) {
        tmp.y += streamHeight;
        stream.tick(tmp, dt);
        tmp.y -= streamHeight;
      }
      for (let i = 0; i < orbit.length; i++) {
        const a = phase + ORBIT_SPEED * t + (i * Math.PI * 2) / orbit.length;
        const c = orbit[i];
        c.position.set(tmp.x + Math.cos(a) * orbitRadius, tmp.y + orbitHeight + Math.sin(a * 2) * 0.08, tmp.z + Math.sin(a) * orbitRadius);
        c.scaling.setAll(orbitSize * ramp);
      }
      if (shell) {
        const pulse = 1 + Math.sin(t * SHELL_PULSE_HZ * Math.PI * 2) * SHELL_PULSE;
        shell.position.set(tmp.x, tmp.y + shellHeight, tmp.z);
        shell.scaling.setAll(opts.shell!.size * pulse * ramp);
        if (shellSpin) shell.rotation.z = shellSpin * t;
      }
      return true;
    },
    release() {
      for (const c of orbit) releaseCard(scene, c);
      orbit.length = 0;
      if (shell) releaseCard(scene, shell);
      for (const r of ribbons) r.stop();
      ribbons.length = 0;
    },
  });

  // A soft stop: ramp down, then the live list releases it.
  return {
    get alive() {
      return fx.alive;
    },
    stop() {
      stopping = true;
    },
  };
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const auraLayer: EffectLayer<AuraOptions, 'aura'> = {
  name: 'aura',
  update,
  reset,
  spawn,
};
