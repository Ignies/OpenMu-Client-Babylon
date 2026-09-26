/**
 * Shroud - the shadow a swarm of spirits brings: one screen-covering card at
 * its anchor, drawn over everything for a while. Evil Spirit's "the screen
 * goes dark" from the reference client, where four 80 cm ALPHA_BLEND_MINUS
 * ribbons and a RENDER_DARK stamp a frame crowd the whole view around the
 * caster (ZzzCharacter.cpp:4584, ZzzEffectJoint.cpp:651).
 *
 * Not a flat sheet: churning smoke that thickens from a clear middle out to
 * the edge of the view, its tendrils curling in and out of the hole, so the
 * darkness moves like energy and the ground always shows through its gaps.
 * Coverage over black, not a subtraction, for the reason model.ts
 * `subtractMaterial` gives. The card faces the camera and ignores depth, and
 * draws first among the transparent effects so the skill's own art lands on
 * top of it. A finished card and its material wait for the next cast.
 *
 * Driven by: `effects.spawn('shroud', …)`. Read by: nobody.
 */
import { Constants, CreatePlane, Mesh, ShaderMaterial, ShaderStore, Vector3, Vector4, type Scene } from '../libs/babylon/exports';
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
const MAX_COVER = 0.8;

/** Seconds to reach full strength. */
const DEFAULT_ATTACK = 0.3;

/** The clear middle and the ramp out of it, as fractions of the card's half-edge (the view spans about 0.4). */
const DEFAULT_HOLE = 0.08;
const DEFAULT_FEATHER = 0.25;

/** How much the smoke thins the coverage in its gaps, 0 (flat) … 1 (gaps fully clear). */
const DEFAULT_SMOKE = 0.7;

/** Radians/s the smoke turns about the anchor. */
const SWIRL = 0.45;

const SHADER = 'fxShroud';

/** Finished cards kept for the next cast (one a cast; a second cast can overlap the first). */
const POOL_MAX = 2;

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
  /** The clear middle and its ramp, as fractions of the half-edge (0 = no clear middle). */
  hole?: number;
  feather?: number;
  /** How much the gaps in the smoke let through, 0…1. */
  smoke?: number;
  /** Follow a moving anchor (the caster). */
  follow?: PointSource;
}

const live = new LiveList();

/** How many shrouds are up (debug). */
export function shroudCount(): number {
  return live.size;
}

const tmp = new Vector3();
let seq = 0;

interface Card {
  scene: Scene;
  card: Mesh;
  mat: ShaderMaterial;
  params: Vector4;
  shape: Vector4;
}

const pool: Card[] = [];

function makeCard(scene: Scene): Card {
  const mat = new ShaderMaterial(`${SHADER}${seq}`, scene, SHADER, {
    attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'params', 'shape'],
    needAlphaBlending: true,
  });
  mat.alphaMode = Constants.ALPHA_COMBINE;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  mat.depthFunction = Constants.ALWAYS;
  const card = CreatePlane('fxShroud', { size: 1 }, scene);
  card.material = mat;
  card.billboardMode = Mesh.BILLBOARDMODE_ALL;
  card.isPickable = false;
  card.receiveShadows = false;
  card.alwaysSelectAsActiveMesh = true;
  card.doNotSyncBoundingInfo = true;
  card.renderingGroupId = EFFECT_RENDERING_GROUP;
  // First among the transparent effects: the skill's own art draws over it.
  card.alphaIndex = -1000;
  card.metadata = { brightMesh: false };
  (scene as TestScene).look?.glow.addExcludedMesh(card);
  return { scene, card, mat, params: new Vector4(), shape: new Vector4() };
}

function disposeCard(c: Card): void {
  c.card.dispose(false, false);
  c.mat.dispose(false, false);
}

function spawn(scene: Scene, at: Vector3, opts: ShroudOptions): EffectHandle {
  registerShader();
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const attack = opts.attack ?? DEFAULT_ATTACK;
  const tail = opts.fadeTail ?? 0.3;
  const cover = Math.min(opts.maxCover ?? MAX_COVER, (opts.cover ?? DEFAULT_COVER) * darkCardGain(scene));
  const source = opts.follow ?? pointSource(at);
  const hole = opts.hole ?? DEFAULT_HOLE;
  const feather = Math.max(0.01, opts.feather ?? DEFAULT_FEATHER);
  const seed = (seq++ * 7.31) % 50;

  const pooled = pool.findIndex(c => c.scene === scene);
  const entry = pooled >= 0 ? pool.splice(pooled, 1)[0] : makeCard(scene);
  const { card, mat, params } = entry;
  params.set(seed, 0, hole, feather);
  mat.setVector4('params', params);
  mat.setVector4('shape', entry.shape.set(clamp01(opts.smoke ?? DEFAULT_SMOKE), SWIRL, 0, 0));
  card.scaling.setAll(opts.size ?? DEFAULT_SIZE);
  card.setEnabled(true);
  keepDepthForEffects(scene);
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
      // The smoke breathes a little as it goes.
      const breath = 0.92 + 0.08 * Math.sin(t * 6);
      params.x = seed + t;
      params.y = cover * rise * (2 - rise) * fadeOut(p, tail) * breath;
      mat.setVector4('params', params);
      return true;
    },
    release() {
      card.setEnabled(false);
      if (pool.length < POOL_MAX && !scene.isDisposed) pool.push(entry);
      else disposeCard(entry);
    },
  });
}

/**
 * params: time, coverage, hole, feather. shape: smoke depth, swirl rate.
 * The card spans -1…1 from the anchor. Two layers of smoke turn opposite
 * ways, twisted harder toward the middle so the tendrils curl in, and their
 * density lifts the edge of the clear middle so it is never a clean circle.
 */
function registerShader(): void {
  if (ShaderStore.ShadersStore[`${SHADER}VertexShader`]) return;

  ShaderStore.ShadersStore[`${SHADER}VertexShader`] = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;

  void main(void) {
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
  `;

  ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = `
  precision highp float;
  uniform vec4 params;
  uniform vec4 shape;
  varying vec2 vUV;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      a *= 0.5;
    }
    return v;
  }

  vec2 rot(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  }

  void main(void) {
    vec2 p = (vUV - 0.5) * 2.0;
    float r = length(p);
    float t = params.x;
    float twist = (1.0 - clamp(r * 2.5, 0.0, 1.0)) * 2.4;
    vec2 q1 = rot(p, t * shape.y + twist);
    vec2 q2 = rot(p, -t * shape.y * 1.3 - twist * 0.7);
    float s1 = fbm(q1 * 9.0 + vec2(0.0, t * 0.5));
    float s2 = fbm(q2 * 16.0 - vec2(t * 0.4, 0.0));
    float smoke = s1 * 0.65 + s2 * 0.35;
    float wisps = smoothstep(0.38, 0.62, smoke);
    float edge = r + (smoke - 0.5) * 0.12;
    float mask = smoothstep(params.z, params.z + params.w, edge);
    float density = mask * mix(1.0 - shape.x, 1.0, wisps);
    gl_FragColor = vec4(0.0, 0.0, 0.0, clamp(density * params.y, 0.0, 1.0));
  }
  `;
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
  for (const c of pool) disposeCard(c);
  pool.length = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const shroudLayer: EffectLayer<ShroudOptions, 'shroud'> = {
  name: 'shroud',
  update,
  reset,
  spawn,
};
