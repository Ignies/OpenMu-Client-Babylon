import {
  Color4,
  GPUParticleSystem,
  ParticleSystem,
  Vector3,
  type Scene,
} from '../libs/babylon/exports';
import { loadEffectTexture } from '../common/moveTargetEffect';
import type { ItemVisualTier } from '../common/itemVisualTier';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

/**
 * Item aura (improved look): a quick shower of falling sparks off the
 * glowing item, from +11. They come off the piece that glows - the
 * breastplate, the boots, the blade in hand - not off the whole body:
 * itemGlowSystem keeps `emitter` on that part's bone, and the shape table
 * below keeps the box they fill the size of the item.
 *
 * One system per character / drop so the emitter can follow the body; the
 * capacity is small and the texture shared (flare01 via loadEffectTexture).
 * It runs on `GPUParticleSystem` where transform feedback is available, so
 * the per-particle update leaves the CPU, the way
 * `common/ambientParticles.ts` already does for weather.
 *
 * Two other emitters used to live here and are gone, both for the same
 * reason: a crowded square multiplied them by every glowing player and every
 * drop on the ground. The orbit rings - one from +9, three at +13 - were a
 * system each whose emitter point circled the item from a per-frame scene
 * observer: forty glowing +13 items were 120 extra systems and 120 extra
 * observers, 8.7 ms of a frame. The steady drift of motes was another system
 * each and read as a haze of dots around everyone. The level still reads
 * through the sparks, the halo, the in-surface sheen and the pooled light.
 *
 * Driven by: `createItemAura` from `ecs/systems/itemGlowSystem.ts` (worn
 * and dropped item tiers), or `effects.spawn('itemAura', …)`. Read by: nobody.
 */

// ---- 1. tuning -------------------------------------------------------------

/**
 * Both concrete classes rather than `IParticleSystem`: the interface omits the
 * `BaseParticleSystem` shape these builders actually set (emit boxes,
 * directions, forceDepthWrite), which both implementations do have.
 */
type AuraSystem = ParticleSystem | GPUParticleSystem;

/** Whether this engine can run the GPU path (cached after the first ask). */
let gpuSupported: boolean | null = null;

function auraGpuSupported(): boolean {
  if (gpuSupported === null) {
    try {
      gpuSupported = GPUParticleSystem.IsSupported;
    } catch {
      gpuSupported = false;
    }
  }
  return gpuSupported;
}

/**
 * A GPU system where possible, the CPU one otherwise. The CPU fallback keeps
 * the original capacity so the look is unchanged on engines that need it.
 */
function createAuraSystem(
  scene: Scene,
  name: string,
  capacity: number
): AuraSystem {
  const system: AuraSystem = auraGpuSupported()
    ? new GPUParticleSystem(name, { capacity }, scene)
    : new ParticleSystem(name, capacity, scene);

  system.blendMode = ParticleSystem.BLENDMODE_ADD;
  system.isLocal = false;

  // Additive and always over the scene, like the sprite pool; the GPU path
  // cannot depth-sort against the scene anyway.
  system.forceDepthWrite = false;

  return system;
}

const FLARE = 'Effect/flare01.OZJ';

/**
 * Hands a system the shared flare once it decodes. The system can be gone by
 * then - the wearer walked out of range, the drop was picked up - and Babylon
 * splices a disposed system out of `scene.particleSystems`, so that is the
 * check. Assigning to a dead system would pin the decoded texture to it and,
 * worse, hide the fact that it is dead.
 */
function flareWhenLoaded(scene: Scene, ps: AuraSystem): void {
  void loadEffectTexture(scene, FLARE).then(texture => {
    if (scene.particleSystems.indexOf(ps) >= 0) ps.particleTexture = texture;
  });
}

const EXC_TINT = new Color4(0.3, 1, 0.7, 1);
const ANCIENT_TINT = new Color4(0.2, 0.8, 0.35, 1);

export type ItemAuraKind = 'character' | 'drop';

/** The glowing piece the aura hangs on; `drop` is the item on the ground. */
export type ItemAuraSlot =
  | 'helm'
  | 'armor'
  | 'pants'
  | 'gloves'
  | 'boots'
  | 'weapon'
  | 'drop';

/**
 * How much room the item takes around its anchor: `up` shifts the box off the
 * anchor (a bone sits at the top of the boot, a drop sits on the floor) and
 * `x/y/z` are the box's half-extents. World units.
 */
type AuraShape = {
  up: number;
  x: number;
  y: number;
  z: number;
};

const SHAPES: Record<ItemAuraSlot, AuraShape> = {
  helm: { up: 0.03, x: 0.13, y: 0.14, z: 0.13 },
  armor: { up: 0, x: 0.2, y: 0.2, z: 0.16 },
  pants: { up: -0.25, x: 0.17, y: 0.28, z: 0.15 },
  gloves: { up: 0, x: 0.1, y: 0.1, z: 0.1 },
  boots: { up: 0.06, x: 0.11, y: 0.14, z: 0.11 },
  weapon: { up: 0, x: 0.12, y: 0.22, z: 0.12 },
  drop: { up: 0.15, x: 0.14, y: 0.13, z: 0.14 },
};

export type ItemAura = EffectHandle & {
  readonly emitter: Vector3;
  /** Same as `stop()`; the name itemGlowSystem has always used. */
  dispose(): void;
};

// ---- 2. state + readers ----------------------------------------------------

export interface ItemAuraOptions {
  tier: ItemVisualTier;
  slot: ItemAuraSlot;
}

/** Every aura handed out and not yet disposed - so a map change can end them. */
const liveAuras = new Set<ItemAura>();

/** How many auras are running (debug). */
export function itemAuraCount(): number {
  return liveAuras.size;
}

function tint(tier: ItemVisualTier): Color4 {
  if (tier.intensity > 0) {
    const [r, g, b] = tier.emissive;
    return new Color4(r, g, b, 1);
  }
  // Specials below +7: the shimmer colour alone.
  return tier.isAncient ? ANCIENT_TINT.clone() : EXC_TINT.clone();
}

function sparks(
  scene: Scene,
  tier: ItemVisualTier,
  slot: ItemAuraSlot,
  emitter: Vector3
): AuraSystem {
  const ps = createAuraSystem(scene, 'itemSparks', 48 + tier.glow * 24);
  ps.emitter = emitter;

  const colour = tint(tier);
  const hot = new Color4(
    Math.min(1, colour.r + 0.5),
    Math.min(1, colour.g + 0.5),
    Math.min(1, colour.b + 0.5),
    1
  );

  ps.color1 = hot;
  ps.color2 = colour;
  ps.colorDead = new Color4(colour.r, colour.g, colour.b, 0);

  ps.minSize = 0.015;
  ps.maxSize = 0.035;
  ps.minLifeTime = 0.35;
  ps.maxLifeTime = 0.7;
  ps.emitRate = Math.round(tier.auraRate * 0.6);

  const shape = SHAPES[slot];
  ps.minEmitBox = new Vector3(-shape.x, shape.up, -shape.z);
  ps.maxEmitBox = new Vector3(shape.x, shape.up + shape.y, shape.z);

  ps.direction1 = new Vector3(-1, 0.4, -1);
  ps.direction2 = new Vector3(1, 1, 1);
  ps.minEmitPower = 0.8;
  ps.maxEmitPower = 1.6;
  ps.gravity = new Vector3(0, -3, 0);

  flareWhenLoaded(scene, ps);

  ps.start();
  return ps;
}

/**
 * Creates the aura for `tier` around the `slot` item at `x,y,z`; move it
 * through `emitter` (itemGlowSystem keeps that on the item's bone).
 */
export function createItemAura(
  scene: Scene,
  tier: ItemVisualTier,
  slot: ItemAuraSlot,
  x: number,
  y: number,
  z: number
): ItemAura | null {
  if (!tier.sparks || tier.auraRate <= 0) return null;

  const emitter = new Vector3(x, y, z);
  const systems: AuraSystem[] = [sparks(scene, tier, slot, emitter)];

  let alive = true;
  const aura: ItemAura = {
    emitter,
    get alive() {
      return alive;
    },
    stop() {
      this.dispose();
    },
    dispose: () => {
      if (!alive) return;
      alive = false;
      liveAuras.delete(aura);
      // `dispose()` defaults to disposing `particleTexture` as well, and every
      // aura in the game shares one cached flare01 (loadEffectTexture). The
      // first drop picked up or wearer walking out of range would otherwise
      // destroy that texture for everyone, and the cache would keep handing
      // out the dead handle - every mote, spark and ring gone for the session.
      for (const ps of systems) ps.dispose(false);
      systems.length = 0;
    },
  };
  liveAuras.add(aura);
  return aura;
}

function spawn(scene: Scene, at: Vector3, opts: ItemAuraOptions): EffectHandle {
  return createItemAura(scene, opts.tier, opts.slot, at.x, at.y, at.z) ?? DEAD_HANDLE;
}

function reset(): void {
  for (const aura of Array.from(liveAuras)) aura.dispose();
  liveAuras.clear();
}

// ---- 3. the layer ----------------------------------------------------------

/** No update: the particle systems step themselves; the emitter is moved by itemGlowSystem. */
export const itemAuraLayer: EffectLayer<ItemAuraOptions, 'itemAura'> = {
  name: 'itemAura',
  reset,
  spawn,
};
