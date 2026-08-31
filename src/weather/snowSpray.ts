import type { WeatherLayer } from './layer';
import {
  Color4,
  ParticleSystem,
  Vector3,
  type Scene,
} from '../libs/babylon/exports';
import { loadEffectTexture } from '../common/moveTargetEffect';
import { GameOptions } from '../common/gameOptions';

/**
 * The puff of loose snow a boot throws when it comes down.
 *
 * Paired with the footprint it belongs to (`footprintSystem` fires both from
 * the same stride), and the reason the two are separate is that they solve
 * different halves of the same moment: the print is what is left behind, this
 * is the snow that had to go somewhere for the print to exist.
 *
 * One system, emitted **manually**. Every ambient recipe in
 * `ambientParticles.ts` is a continuous emitter with a rate that ramps; this
 * is the opposite shape — nothing at all, then eight particles in one frame,
 * then nothing again — so it drives `manualEmitCount` directly rather than
 * pretending to be a rate.
 *
 * Note what this can and cannot buy on Devias. Nothing drawn white reads
 * against sunlit snow, so the spray is nearly invisible over open ground; what
 * it does read against is the hero's own silhouette and the shadow they cast,
 * which is exactly where the reference shows it. It is a detail around the
 * feet, not a feature you see from across the square.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Flakes per step at full strength. */
const PER_STEP = 9;

/** Ceiling on the pool: about six strides of overlapping bursts. */
const CAPACITY = 160;

// ---- 2. state + readers ----------------------------------------------------

let system: ParticleSystem | null = null;
let emitter: Vector3 | null = null;
let ready = false;

function ensureSystem(scene: Scene): ParticleSystem {
  if (system && system.getScene() === scene) {
    return system;
  }

  // A system built for another scene: dispose it, or its buffers outlive
  // the scene that owned them.
  if (system) resetSnowSpray();

  emitter = new Vector3();

  const ps = new ParticleSystem('snowSpray', CAPACITY, scene);
  ps.emitter = emitter;
  ps.isLocal = false;
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;

  // A tight cluster at the boot rather than a cloud around it.
  ps.minEmitBox = new Vector3(-0.06, 0, -0.06);
  ps.maxEmitBox = new Vector3(0.06, 0.05, 0.06);

  // Up and outward. The heading is applied by the caller rotating the
  // direction cone would cost a system per angle, and kicked snow scatters
  // more than it aims.
  ps.direction1 = new Vector3(-0.6, 1, -0.6);
  ps.direction2 = new Vector3(0.6, 1.6, 0.6);
  ps.minEmitPower = 0.5;
  ps.maxEmitPower = 1.6;

  // Falls back down well within its life, so the puff arcs instead of drifting.
  ps.gravity = new Vector3(0, -7, 0);

  ps.minLifeTime = 0.3;
  ps.maxLifeTime = 0.65;
  ps.minSize = 0.045;
  ps.maxSize = 0.1;
  ps.minAngularSpeed = -4;
  ps.maxAngularSpeed = 4;

  ps.color1 = new Color4(1, 1, 1, 0.9);
  ps.color2 = new Color4(0.93, 0.96, 1, 0.75);
  ps.colorDead = new Color4(0.93, 0.96, 1, 0);

  // Fade in over the first fifth and out over the last third: a flake that
  // blinks out mid-arc is the same pop the ambient emitters were fixed for.
  ps.addColorGradient(0, new Color4(1, 1, 1, 0));
  ps.addColorGradient(0.2, new Color4(1, 1, 1, 0.9));
  ps.addColorGradient(0.65, new Color4(0.95, 0.97, 1, 0.7));
  ps.addColorGradient(1, new Color4(0.93, 0.96, 1, 0));

  ps.forceDepthWrite = false;

  // Nothing until a step asks for some.
  ps.emitRate = 0;
  ps.manualEmitCount = 0;

  void loadEffectTexture(scene, 'World3/leaf01.OZT').then(texture => {
    if (system === ps) {
      ps.particleTexture = texture;
      ready = true;
    }
  });

  ps.start();
  system = ps;

  return ps;
}

/**
 * Throw a puff of snow at a foot.
 *
 * `strength` is the same 0…1 the print is drawn at, so a boot scuffing thin
 * cover kicks up correspondingly little.
 */
export function snowSprayBurst(
  scene: Scene,
  x: number,
  y: number,
  z: number,
  strength: number
): void {
  if (strength <= 0) return;
  if (!GameOptions.advancedEffects) return;

  const ps = ensureSystem(scene);

  // Before the texture lands a burst would draw as untextured white squares.
  if (!ready) return;

  emitter?.set(x, y, z);

  const count = Math.max(1, Math.round(PER_STEP * Math.min(1, strength)));

  // Additive rather than assigned: two feet landing in one frame should throw
  // two puffs, not have the second overwrite the first.
  ps.manualEmitCount = Math.max(0, ps.manualEmitCount) + count;
}

/** Drop the spray — a map change or a teardown. */
export function resetSnowSpray(): void {
  system?.dispose(false);
  system = null;
  emitter = null;
  ready = false;
}

// ---- 3. the layer ----------------------------------------------------------

/** The layer (see layer.ts). Reset only: bursts are fired by `FootprintSystem`. */
export const snowSprayLayer: WeatherLayer = {
  name: 'snowSpray',
  reset: resetSnowSpray,
};
