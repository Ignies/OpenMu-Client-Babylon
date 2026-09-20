/**
 * Shroud - the darkness a swarm of spirits brings: one screen-covering black
 * card with a soft clear hole around its anchor, drawn over everything for a
 * while. Evil Spirit's "the screen goes dark" from the reference client, where
 * four 80 cm ALPHA_BLEND_MINUS ribbons and a RENDER_DARK stamp a frame crowd
 * the whole view around the caster (ZzzCharacter.cpp:4584, ZzzEffectJoint.cpp:651);
 * read here as one card so it is the same darkness on every tier.
 *
 * Coverage, not a subtraction, for the reason model.ts `subtractMaterial`
 * gives: a subtraction caps at its sheet's level, coverage can go as dark as
 * asked. The card faces the camera at the anchor and ignores depth, so it
 * darkens whatever is on screen at that moment; it draws first among the
 * transparent effects, so the skill's own bright art lands on top of it.
 *
 * Driven by: `effects.spawn('shroud', …)`. Read by: nobody.
 */
import { Constants, CreatePlane, Material, Mesh, RawTexture, StandardMaterial, Vector3, type Scene } from '../libs/babylon/exports';
import type { TestScene } from '../scenes/testScene';
import { EFFECT_RENDERING_GROUP, LiveList, clamp01, darkCardGain, fadeOut, keepDepthForEffects, pointSource, type PointSource } from './core';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds it holds when none is given: Evil Spirit's 49 ticks. */
const DEFAULT_SECONDS = 49 / 25;

/** Card edge in tiles: wide enough to cover the view at any zoom the camera allows. */
const DEFAULT_SIZE = 48;

/** Coverage at full strength, 0…1, before the map's dark gain. */
const DEFAULT_COVER = 0.6;

/** The most of the frame it ever takes: never fully black. */
const MAX_COVER = 0.85;

/** Seconds to reach full strength. */
const DEFAULT_ATTACK = 0.25;

/** The clear hole around the anchor and its feather, as fractions of the card's half-edge. */
const HOLE = 0.05;
const FEATHER = 0.12;

/** Coverage ramp resolution. */
const RAMP_SIZE = 256;

// ---- 2. state + readers ----------------------------------------------------

export interface ShroudOptions {
  seconds?: number;
  /** Coverage at full strength, 0…1. */
  cover?: number;
  /** The most it ever covers, 0…1 (default MAX_COVER): the caster's own view is capped lower. */
  maxCover?: number;
  /** Seconds to reach full strength. */
  attack?: number;
  /** Fade tail as a fraction of life. */
  fadeTail?: number;
  /** Card edge in tiles. */
  size?: number;
  /** Follow a moving anchor (the caster). */
  follow?: PointSource;
}

const live = new LiveList();

/** How many shrouds are up (debug). */
export function shroudCount(): number {
  return live.size;
}

const ramps = new Map<Scene, RawTexture>();
const tmp = new Vector3();

/** The coverage ramp: clear inside HOLE, full past HOLE + FEATHER, one per scene. */
function rampTexture(scene: Scene): RawTexture {
  let tex = ramps.get(scene);
  if (tex) return tex;
  const n = RAMP_SIZE;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (x + 0.5) / n - 0.5;
      const dy = (y + 0.5) / n - 0.5;
      const r = Math.hypot(dx, dy) * 2;
      const t = clamp01((r - HOLE) / FEATHER);
      const a = t * t * (3 - 2 * t);
      const o = (y * n + x) * 4;
      data[o + 3] = Math.round(a * 255);
    }
  }
  tex = RawTexture.CreateRGBATexture(data, n, n, scene, false, false);
  tex.hasAlpha = true;
  tex.wrapU = tex.wrapV = 0; // CLAMP
  ramps.set(scene, tex);
  return tex;
}

function spawn(scene: Scene, at: Vector3, opts: ShroudOptions): EffectHandle {
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const attack = opts.attack ?? DEFAULT_ATTACK;
  const tail = opts.fadeTail ?? 0.3;
  const cover = Math.min(opts.maxCover ?? MAX_COVER, (opts.cover ?? DEFAULT_COVER) * darkCardGain(scene));
  const source = opts.follow ?? pointSource(at);

  const mat = new StandardMaterial('fxShroud', scene);
  mat.diffuseColor.set(0, 0, 0);
  mat.specularColor.set(0, 0, 0);
  mat.ambientColor.set(0, 0, 0);
  mat.emissiveColor.set(0, 0, 0);
  mat.disableLighting = true;
  mat.alphaMode = Constants.ALPHA_COMBINE;
  mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.depthFunction = Constants.ALWAYS;
  mat.fogEnabled = false;
  mat.opacityTexture = rampTexture(scene);
  mat.alpha = 0;

  const card = CreatePlane('fxShroud', { size: 1 }, scene);
  card.material = mat;
  card.billboardMode = Mesh.BILLBOARDMODE_ALL;
  card.scaling.setAll(opts.size ?? DEFAULT_SIZE);
  card.isPickable = false;
  card.receiveShadows = false;
  card.alwaysSelectAsActiveMesh = true;
  card.doNotSyncBoundingInfo = true;
  card.renderingGroupId = EFFECT_RENDERING_GROUP;
  // First among the transparent effects: the skill's own bright art draws over it.
  card.alphaIndex = -1000;
  card.metadata = { brightMesh: false };
  keepDepthForEffects(scene);
  (scene as TestScene).look?.glow.addExcludedMesh(card);
  source(tmp);
  card.position.copyFrom(tmp);

  let t = 0;
  return live.push({
    update(dt) {
      t += dt;
      const p = t / seconds;
      if (p >= 1) return false;
      source(tmp);
      card.position.copyFrom(tmp);
      const rise = attack > 0 ? clamp01(t / attack) : 1;
      mat.alpha = cover * rise * (2 - rise) * fadeOut(p, tail);
      return true;
    },
    release() {
      card.dispose(false, false);
      mat.dispose(false, false);
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
  for (const tex of ramps.values()) tex.dispose();
  ramps.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const shroudLayer: EffectLayer<ShroudOptions, 'shroud'> = {
  name: 'shroud',
  update,
  reset,
  spawn,
};
