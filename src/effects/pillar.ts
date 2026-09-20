/**
 * Pillar - a tall column of fire erupting out of a lump of molten rock at a
 * ground point. The renewed Flame: where `column.ts` stacks the original's
 * BITMAP_FLAME tongue cards knee-high, this stands a white-cored sheet of
 * fire several tiles tall on a cracked lava ball that lights the ground red.
 *
 * One pillar is a Y-billboard quad through a small fire shader (scrolling
 * turbulence, a hot core, a ragged orange rim), an opaque cracked-lava sphere
 * at its foot with an additive shell for the glow of the cracks, a flare on
 * the ground and one on the ball, and a few tongues and sparks off the base.
 *
 * Driven by: `effects.spawn('pillar', …)`. Read by: nobody.
 */
import {
  Constants,
  CreatePlane,
  CreateSphere,
  Matrix,
  Mesh,
  ShaderMaterial,
  ShaderStore,
  StandardMaterial,
  Vector3,
  Vector4,
  VertexBuffer,
  type Scene,
} from '../libs/babylon/exports';
import { linearBufferActive } from '../common/lightModel';
import { Store } from '../store';
import type { TestScene } from '../scenes/testScene';
import {
  EFFECT_RENDERING_GROUP,
  Emitter,
  LiveList,
  acquireCard,
  additiveMaterial,
  clamp01,
  effectTexture,
  hash,
  keepDepthForEffects,
  lerp,
  lightCardGain,
  releaseCard,
  type Card,
  type RGB,
} from './core';
import { addEffectGlow, releaseEffectGlow } from './glow';
import { FIRE_SPARKS, FLAME_TONGUES, RGBS, TEX } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds a pillar stands: the original column's 40 ticks. */
const DEFAULT_SECONDS = 1.6;

/** Fire sheet height in tiles: the reference columns run off the top of the frame. */
const DEFAULT_HEIGHT = 6;

/** Fire sheet width in tiles: the column is about a tile across, the flare at the foot wider. */
const DEFAULT_WIDTH = 2.2;

/** Seconds the column takes to shoot up out of the ground. */
const ERUPT = 0.14;

/** Seconds the column takes to lift off and die at the end. */
const DIE = 0.45;

/** Tiles/s the turbulence runs up the sheet. */
const RISE = 3.2;

/** Noise cells per tile: features about 60 cm across. */
const CELLS = 1.6;

/** How much wider than the column the foot flares (0 = a straight column). */
const FOOT_FLARE = 0.7;

/** Lava ball diameter in tiles, and how high its centre sits over the ground. */
const BALL_DIAMETER = 0.56;
const BALL_LIFT = 0.17;

/** MODEL_FIRE's cracked lava core sheet: dark crust, glowing cracks. */
const LAVA_SHEET = 'Skill/fire02.OZJ';

/** The crust's level: the sheet at a third, so it reads as rock and the cracks' glow is the shell's. */
const CRUST_LEVEL = 0.35;

/** The glow of the cracks: the sheet's red-orange lifted toward yellow. */
const CRACK_GLOW: RGB = [1, 0.5, 0.2];

/** Flare card edges in tiles: the pool on the ground, the halo on the ball. */
const GROUND_GLOW = 2.4;
const BALL_GLOW = 0.65;

/** The pool's colour: a deep red wash, most of the ground light is the point light's. */
const POOL_COLOUR: RGB = [0.55, 0.14, 0.03];

/** Tongues and sparks a second off the foot while it burns. */
const TONGUE_RATE = 18;
const SPARK_RATE = 14;

const SHADER = 'fxPillar';

// ---- 2. state + readers ----------------------------------------------------

export interface PillarOptions {
  /** Seconds it stands, eruption and die-down included. */
  seconds?: number;
  /** Sheet height in tiles. */
  height?: number;
  /** Sheet width in tiles. */
  width?: number;
  /** Tint on the fire (white = the reference's yellow-white core). */
  colour?: RGB;
  /** No lava ball: a pillar out of bare ground. */
  bare?: boolean;
}

const live = new LiveList();

/** How many pillars are burning (debug). */
export function pillarCount(): number {
  return live.size;
}

const crusts = new Map<Scene, StandardMaterial>();
const tmp = new Vector3();
let seq = 0;

/** Unlit, opaque: the sheet x CRUST_LEVEL, one per scene. */
function crustMaterial(scene: Scene): StandardMaterial {
  let m = crusts.get(scene);
  if (m) return m;
  const mat = new StandardMaterial('fx:lavaCrust', scene);
  mat.diffuseColor.set(0, 0, 0);
  mat.specularColor.set(0, 0, 0);
  mat.ambientColor.set(0, 0, 0);
  mat.emissiveColor.set(CRUST_LEVEL, CRUST_LEVEL, CRUST_LEVEL);
  mat.disableLighting = true;
  mat.fogEnabled = false;
  void effectTexture(scene, LAVA_SHEET).then(tex => {
    if (crusts.get(scene) === mat) mat.diffuseTexture = tex;
  });
  crusts.set(scene, mat);
  m = mat;
  return m;
}

/**
 * Wrap the sheet `repeats` times around the sphere, mirrored every other
 * time so it stays inside 0…1 - the shared effect textures are CLAMP.
 */
function mirrorUVs(mesh: Mesh, repeats: number): void {
  const uvs = mesh.getVerticesData(VertexBuffer.UVKind);
  if (!uvs) return;
  const out = new Float32Array(uvs.length);
  for (let i = 0; i < uvs.length; i += 2) {
    const u = uvs[i] * repeats;
    const whole = Math.floor(u);
    const f = u - whole;
    out[i] = whole % 2 === 0 ? f : 1 - f;
    out[i + 1] = uvs[i + 1];
  }
  mesh.setVerticesData(VertexBuffer.UVKind, out, false);
}

function fireMaterial(scene: Scene, seed: number, width: number, height: number, tint: RGB): ShaderMaterial {
  registerShader();
  const mat = new ShaderMaterial(`fxPillar${seq}`, scene, SHADER, {
    attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'params', 'look', 'dims', 'tint'],
    needAlphaBlending: true,
  });
  mat.alphaMode = Constants.ALPHA_ADD;
  mat.backFaceCulling = false;
  mat.disableDepthWrite = true;
  // The same two numbers additiveMaterial bakes into a Standard tint: the
  // map's level, and whether the buffer wants the colour decoded.
  mat.setVector4('look', new Vector4(lightCardGain(scene), linearBufferActive(scene) ? 1 : 0, FOOT_FLARE, seed));
  mat.setVector4('dims', new Vector4(width, height, RISE, CELLS));
  mat.setVector3('tint', new Vector3(tint[0], tint[1], tint[2]));
  return mat;
}

function spawn(scene: Scene, at: Vector3, opts: PillarOptions): EffectHandle {
  const seconds = opts.seconds ?? DEFAULT_SECONDS;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const width = opts.width ?? DEFAULT_WIDTH;
  const seed = hash(seq++) * 97;
  const look = (scene as TestScene).look;
  // On the ground under the point, whatever height the caller sampled.
  const ground = Store.world?.getTerrainHeight(at.x, at.z) ?? at.y;

  // The fire: a sheet standing on its foot, turned to the camera about the up axis.
  const sheet = CreatePlane(`fxPillar${seq}`, { width, height }, scene);
  sheet.bakeTransformIntoVertices(Matrix.Translation(0, height / 2, 0));
  sheet.billboardMode = Mesh.BILLBOARDMODE_Y;
  sheet.isPickable = false;
  sheet.alwaysSelectAsActiveMesh = true;
  sheet.receiveShadows = false;
  sheet.doNotSyncBoundingInfo = true;
  sheet.renderingGroupId = EFFECT_RENDERING_GROUP;
  keepDepthForEffects(scene);
  sheet.metadata = { brightMesh: true };
  const fire = fireMaterial(scene, seed, width, height, opts.colour ?? RGBS.white);
  sheet.material = fire;
  sheet.position.set(at.x, ground - 0.05, at.z);
  look?.glow.addExcludedMesh(sheet);
  addEffectGlow(scene, sheet);
  const params = new Vector4(0, 0, 0, 0);

  // The rock: an opaque crust that writes depth, and the glow of its cracks over it.
  let ball: Mesh | null = null;
  let shell: Mesh | null = null;
  if (!opts.bare) {
    ball = CreateSphere(`fxLava${seq}`, { diameter: BALL_DIAMETER, segments: 12 }, scene);
    mirrorUVs(ball, 2);
    ball.material = crustMaterial(scene);
    ball.isPickable = false;
    ball.receiveShadows = false;
    ball.alwaysSelectAsActiveMesh = true;
    // Matter, not light: the G-buffer sees it, so the AO and the haze read its own depth.
    ball.metadata = { depthOccluder: true };
    ball.rotation.set(0.5, seed, 0.3);
    ball.position.set(at.x, ground + BALL_LIFT, at.z);
    ball.scaling.setAll(0.01);
    look?.glow.addExcludedMesh(ball);

    shell = CreateSphere(`fxLavaGlow${seq}`, { diameter: BALL_DIAMETER * 1.06, segments: 12 }, scene);
    mirrorUVs(shell, 2);
    shell.material = additiveMaterial(scene, LAVA_SHEET, CRACK_GLOW);
    shell.isPickable = false;
    shell.receiveShadows = false;
    shell.alwaysSelectAsActiveMesh = true;
    shell.renderingGroupId = EFFECT_RENDERING_GROUP;
    shell.metadata = { brightMesh: true };
    shell.parent = ball;
    look?.glow.addExcludedMesh(shell);
    addEffectGlow(scene, shell);
  }

  // The light it throws on what is around it, as art: a pool on the ground and a halo on the rock.
  const pool: Card = acquireCard(scene, additiveMaterial(scene, TEX.flare, POOL_COLOUR), false);
  pool.rotation.x = Math.PI / 2;
  pool.position.set(at.x, ground + 0.04, at.z);
  pool.scaling.setAll(GROUND_GLOW);
  const halo: Card | null = ball ? acquireCard(scene, additiveMaterial(scene, TEX.flare, RGBS.ember)) : null;
  if (halo) {
    halo.position.set(at.x, ground + BALL_LIFT + 0.1, at.z);
    halo.scaling.setAll(BALL_GLOW);
  }

  const tongues = new Emitter(scene, FLAME_TONGUES, TONGUE_RATE);
  const sparks = new Emitter(scene, FIRE_SPARKS, SPARK_RATE);
  const foot = new Vector3(at.x, ground + 0.15, at.z);

  let t = 0;
  return live.push({
    update(dt) {
      t += dt;
      if (t >= seconds) return false;
      const erupt = clamp01(t / ERUPT);
      const dying = clamp01((t - (seconds - DIE)) / DIE);
      const flicker = 0.88 + 0.12 * Math.sin(t * 23 + seed);
      const intensity = erupt * (2 - erupt) * (1 - dying * dying) * flicker;

      params.set(t + seed, intensity, lerp(0.08, 1.25, 1 - (1 - erupt) * (1 - erupt)), dying * 1.15);
      fire.setVector4('params', params);

      if (ball) {
        const pop = clamp01(t / 0.1);
        ball.scaling.setAll(Math.max(0.01, Math.sqrt(pop)));
        ball.rotation.y += 1.4 * dt;
        // Sinks back into the earth as the fire lifts off it.
        ball.position.y = ground + BALL_LIFT - dying * BALL_DIAMETER * 0.9;
        if (shell) shell.visibility = 1 - dying;
      }
      pool.visibility = intensity;
      if (halo) halo.visibility = 0.35 * intensity * (1 - dying);

      if (dying === 0) {
        tongues.tick(foot, dt);
        sparks.tick(tmp.set(foot.x, foot.y + 0.1, foot.z), dt);
      }
      return true;
    },
    release() {
      releaseEffectGlow(sheet);
      sheet.dispose(false, false);
      fire.dispose(true, false);
      if (shell) {
        releaseEffectGlow(shell);
        shell.dispose(false, false);
      }
      ball?.dispose(false, false);
      releaseCard(scene, pool);
      if (halo) releaseCard(scene, halo);
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
  for (const m of crusts.values()) m.dispose(false, false);
  crusts.clear();
}

/**
 * The fire. `params`: time, intensity, top cutoff, bottom cutoff (both in
 * 0…1 of the height). `look`: gain, linear flag, foot flare, seed. `dims`:
 * width, height, rise, cells per tile. The turbulence is value-noise fbm
 * scrolled up the sheet and stretched tall so it reads as strands, the
 * column's edge is that noise pushing a width profile in and out (the
 * tongues), and the colour is a heat ramp from a red rim through orange and
 * yellow to the white core.
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
  uniform vec4 look;
  uniform vec4 dims;
  uniform vec3 tint;
  varying vec2 vUV;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return s;
  }

  void main(void) {
    float t = params.x;
    float x = (vUV.x - 0.5) * dims.x;
    float y = vUV.y * dims.y;
    float yn = vUV.y;

    vec2 q = vec2(x * 2.2, (y - t * dims.z) * 0.9) * dims.w + look.w;
    float n = fbm(q);
    float n2 = fbm(q * 2.1 + vec2(5.3, t * 1.3));

    float flare = 1.0 + look.z * exp(-y * 4.0);
    float hw = 0.5 * flare * (1.0 - 0.18 * yn);
    float edge = hw * (0.35 + 1.1 * n);
    float d = abs(x) / edge;
    float body = 1.0 - smoothstep(0.5, 1.0, d);
    float core = 1.0 - smoothstep(0.1, 0.85, d);

    float top = 1.0 - smoothstep(params.z - 0.3, params.z, yn);
    float bottom = smoothstep(params.w - 0.35, params.w, yn);
    float tip = 1.0 - smoothstep(0.6, 1.0, yn);
    float heat = body * top * bottom * (0.72 + 0.28 * n2 + 0.3 * core) * mix(0.5, 1.0, tip);
    float h = clamp(heat * params.y, 0.0, 1.2);

    vec3 col = mix(vec3(0.8, 0.08, 0.0), vec3(1.0, 0.4, 0.03), smoothstep(0.0, 0.35, h));
    col = mix(col, vec3(1.0, 0.8, 0.25), smoothstep(0.3, 0.6, h));
    col = mix(col, vec3(1.0, 1.0, 0.9), smoothstep(0.62, 0.95, h));
    col *= min(h, 1.0) * tint * look.x;
    if (look.y > 0.5) col = pow(col, vec3(2.2));

    gl_FragColor = vec4(col, 1.0);
  }
  `;
}

// ---- 3. the layer ----------------------------------------------------------

export const pillarLayer: EffectLayer<PillarOptions, 'pillar'> = {
  name: 'pillar',
  update,
  reset,
  spawn,
};
