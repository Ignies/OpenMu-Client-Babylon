import { Texture, type Effect, type Scene } from '../babylon/exports';
import { ENUM_WORLD } from '../../common/types';
import { GameOptions } from '../../common/gameOptions';
import { createOZJTexture } from '../../common/utils';
import { downloadDataFile } from './dataFolder';

/**
 * Animated water terrain (gap 5.1): the CSWaterTerrain.cpp wave motion on the
 * maps the original animates, run in the terrain material's vertex stage as a
 * pure function of the `time` uniform, plus Atlans' additive 32-frame caustics
 * flipbook (ZzzLodTerrain.cpp:1591-1596) in the fragment.
 *
 * Same shape as terrainOverlay.ts: a registry keyed by ENUM_WORLD, read at
 * map load; the chunks compile in only where a map has them, so every other
 * map keeps the shader it always had, byte for byte. The `animatedWater`
 * option gates the registry the way `advancedEffects` gates the overlays.
 */

export type TerrainWaterSpec = {
  /** Water tile slot in getTilesList order - 5 everywhere. */
  readonly layer: number;
  /** Wave height multiplier; 1 = the CSWaterTerrain amplitudes as ported. */
  readonly scale: number;
  /** Draw the Object8 wt00..wt31 caustics flipbook over the water tiles. */
  readonly flipbook: boolean;
};

const WATER_BY_WORLD: Partial<Record<ENUM_WORLD, TerrainWaterSpec>> = {
  // The one map the original gives the water treatment on its terrain.
  // Doppelganger 3 reuses Atlans' art and takes one more line here when it
  // lands; Hellas' dedicated surface plane could opt in the same way.
  [ENUM_WORLD.WD_7ATLANSE]: { layer: 5, scale: 1, flipbook: true },
};

/** Read at map load, like `terrainOverlaysFor`: off = the old shader. */
export function terrainWaterFor(map: ENUM_WORLD): TerrainWaterSpec | null {
  if (!GameOptions.animatedWater) return null;
  return WATER_BY_WORLD[map] ?? null;
}

/** SceneManager.cpp:305 - 32 frames, one per 25 Hz reference tick. */
const FLIP_FRAMES = 32;
const FLIP_FPS = 25;

/** SpawnAmbientWave: one ambient wave every 40/25 s = 1600 ms. */
export const AMBIENT_WAVE_INTERVAL = 1.6;
/** calcWave propagates one half-tile cell per 25 Hz tick = 12.5 tiles/s. */
export const AMBIENT_WAVE_SPEED = 12.5;
/** `newh -= newh >> 4` per tick: 0.9375^25 = e^-1.61 per second. */
export const AMBIENT_WAVE_DAMPING = 1.61;
/** addSineWave height 2000 -> ~250 units, x0.5 surface weight, /100 tiles. */
export const AMBIENT_WAVE_AMPLITUDE = 1.25;

const RING_SLOTS = 3;

export type TerrainWaterRuntime = {
  readonly spec: TerrainWaterSpec;
  /** wt00..wt31 in frame order; empty when the flipbook is unavailable. */
  readonly frames: readonly Texture[];
  /** vec4 per slot: center x, center z (tiles), spawn time (s), active. */
  readonly rings: number[];
  lastSpawnIndex: number;
};

export function createTerrainWaterRuntime(
  spec: TerrainWaterSpec,
  frames: readonly Texture[]
): TerrainWaterRuntime {
  return { spec, frames, rings: new Array(RING_SLOTS * 4).fill(0), lastSpawnIndex: 0 };
}

/**
 * MapManager.cpp:117-140 loads Object8/wt00..wt31 for Atlans whatever world
 * folder is active, so the path is fixed. A failure is not fatal: the waves
 * still run, only the caustics layer is dropped.
 */
export async function loadTerrainWaterFlipbook(
  scene: Scene,
  spec: TerrainWaterSpec
): Promise<Texture[]> {
  if (!spec.flipbook) return [];

  const results = await Promise.allSettled(
    Array.from({ length: FLIP_FRAMES }, (_, i) => {
      const name = `Object8/wt${String(i).padStart(2, '0')}.OZJ`;
      return downloadDataFile(name).then(bytes =>
        createOZJTexture(scene, name, bytes)
      );
    })
  );

  const frames = results
    .filter((r): r is PromiseFulfilledResult<Texture> => r.status === 'fulfilled')
    .map(r => r.value);

  if (frames.length !== FLIP_FRAMES) {
    for (const t of frames) t.dispose();
    console.warn('Water flipbook unavailable, caustics disabled');
    return [];
  }

  // The original binds these GL_LINEAR (MapManager.cpp:133); the OZJ helper
  // defaults to nearest for the splat tiles.
  for (const t of frames) {
    t.updateSamplingMode(Texture.BILINEAR_SAMPLINGMODE);
  }

  return frames;
}

export function disposeTerrainWaterFrames(frames: readonly Texture[]): void {
  for (const t of frames) t.dispose();
}

/**
 * FaceTexture with Scale=true (ZzzLodTerrain.cpp:1499): 16 texels per tile,
 * i.e. one repeat every width/16 tiles. vUV is x/256, so the multiplier is
 * 256 / (width / 16).
 */
export function terrainWaterFlipUvScale(frames: readonly Texture[]): number {
  const width = frames[0]?.getSize().width || 256;
  return 4096 / width;
}

function f(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : `${n}`;
}

/**
 * The wave field, GLSL. All constants are CSWaterTerrain.cpp with units
 * converted: time seconds (WorldTime is ms), positions in tiles on the
 * half-tile grid (i = 2z, j = 2x), heights original / 100, base sines
 * weighted 0.25 and the ripple page 0.5 (CreateTerrain :129-134).
 *
 * calcBaseWave :288-293:
 *   wave2 = sin(T*.005 + i*.1 + j*.1)*50 - sin(T*.003 + j*.1 + i*.5)*50
 *   wave3 = sin(T*.001 + i*.5 + j*.5)*25 - sin(T*.002 + j*1. + i*.3)*25
 *
 * The ambient rings replace the two-page automaton with the analytic wave it
 * produces: a front expanding at AMBIENT_WAVE_SPEED, damped by
 * AMBIENT_WAVE_DAMPING, spreading cylindrically.
 */
export function terrainWaterVertexDeclarationsGlsl(): string {
  return `
  uniform float time;
  uniform vec4 muWaterWaves[${RING_SLOTS}];

  float muWaterWave(vec2 p, float t) {
    float h = 0.125 * sin(t * 5.0 + p.y * 0.2 + p.x * 0.2)
            - 0.125 * sin(t * 3.0 + p.x * 0.2 + p.y)
            + 0.0625 * sin(t + p.y + p.x)
            - 0.0625 * sin(t * 2.0 + p.x * 2.0 + p.y * 0.6);
    for (int i = 0; i < ${RING_SLOTS}; i++) {
      vec4 w = muWaterWaves[i];
      float age = t - w.z;
      if (w.w > 0.5 && age > 0.0) {
        float d = distance(p, w.xy);
        float front = ${f(AMBIENT_WAVE_SPEED)} * age;
        float band = (d - front) / 1.5;
        h += ${f(AMBIENT_WAVE_AMPLITUDE)} * exp(-${f(AMBIENT_WAVE_DAMPING)} * age)
           * inversesqrt(max(front, 1.0))
           * exp(-band * band) * cos(3.0 * (d - front));
      }
    }
    return h;
  }
  `;
}

/**
 * The displacement, emitted after `worldPosition` is computed. Weight: 1 on
 * a tile drawn as opaque water, the vertex's own blend alpha where water is
 * layered over ground - coincident corners of adjacent tiles carry the same
 * alpha, so the surface stays crack-free and dies out at the authored
 * shoreline fade.
 */
export function terrainWaterVertexGlsl(spec: TerrainWaterSpec): string {
  const lo = f(spec.layer - 0.5);
  const hi = f(spec.layer + 0.5);
  return `
  float muWaterW = 0.0;
  if (uv2.x > ${lo} && uv2.x < ${hi}) muWaterW = 1.0;
  else if (uv2.y > ${lo} && uv2.y < ${hi}) muWaterW = matricesWeights.a;
  if (muWaterW > 0.0) {
    worldPosition.y += muWaterWave(worldPosition.xz, time) * muWaterW * ${f(spec.scale)};
  }
  `;
}

/**
 * FaceTexture :1540-1552: the water texture's V wobbles per vertex by
 * TerrainGrassWind[x] * 0.002, TerrainGrassWind = sin(WindSpeed + x*5) * 10
 * (:2430), WindSpeed = T*0.002 (:2386) - continuous form for the GrassWind
 * slot the shader already feeds into the water UV.
 */
export function terrainWaterGrassWindGlsl(): string {
  return `0.02 * sin(time * 2.0 + vWorldXZ.x * 5.0)`;
}

/**
 * ZzzLodTerrain.cpp:1591-1596: on Atlans a tile whose layer 2 is the water
 * slot skips the normal alpha pass; the flipbook replaces it.
 */
export function terrainWaterAlphaSkipGlsl(
  runtime: TerrainWaterRuntime
): string {
  if (!runtime.frames.length) return '';
  const lo = f(runtime.spec.layer - 0.5);
  const hi = f(runtime.spec.layer + 0.5);
  return `
    if (vAlphaTexture > ${lo} && vAlphaTexture < ${hi}) alphaRendered = false;
  `;
}

/**
 * The additive caustics pass over `colorVar`, after the lighting multiply -
 * the original's RenderFaceBlend is unlit, coloured only by the tile alpha
 * (VertexBlend* :1348-1353).
 */
export function terrainWaterCausticsGlsl(
  runtime: TerrainWaterRuntime,
  colorVar: string
): string {
  if (!runtime.frames.length) return '';
  const lo = f(runtime.spec.layer - 0.5);
  const hi = f(runtime.spec.layer + 0.5);
  return `
    float muCausticW = 0.0;
    if (vOpaqueTexture > ${lo} && vOpaqueTexture < ${hi}) muCausticW = 1.0;
    else if (vAlphaTexture > ${lo} && vAlphaTexture < ${hi}) muCausticW = vAlphaColor.a;
    if (muCausticW > 0.0) {
      ${colorVar} += texture2D(waterFlip, vUV * ${f(
        terrainWaterFlipUvScale(runtime.frames)
      )}).rgb * muCausticW;
    }
  `;
}

export function terrainWaterUniforms(): string[] {
  return ['muWaterWaves'];
}

export function terrainWaterSamplers(runtime: TerrainWaterRuntime): string[] {
  return runtime.frames.length ? ['waterFlip'] : [];
}

/** Deterministic stand-in for the original's Random::RangeInt spawn jitter. */
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * SpawnAmbientWave :98-110: every 1600 ms a wave lands near the hero -
 * x = heroX*2 + rand(-15,14), y = heroY*2 + 25, in half-tiles. The anchor
 * here is the camera target (the hero, in play); spawn times sit on the
 * material's own clock so the wave shape stays a pure function of the time
 * uniform and the slot values.
 */
function updateAmbientRings(
  runtime: TerrainWaterRuntime,
  et: number,
  scene: Scene
): void {
  const k = Math.floor(et / AMBIENT_WAVE_INTERVAL);
  if (k <= runtime.lastSpawnIndex) return;

  const cam = scene.activeCamera as unknown as {
    target?: { x: number; z: number };
    position?: { x: number; z: number };
  } | null;
  const anchor = cam?.target ?? cam?.position ?? { x: 128, z: 128 };

  for (let s = Math.max(runtime.lastSpawnIndex + 1, k - RING_SLOTS + 1); s <= k; s++) {
    const at = (s % RING_SLOTS) * 4;
    runtime.rings[at + 0] = anchor.x - 7.5 + hash01(s) * 14.5;
    runtime.rings[at + 1] = anchor.z + 12.5;
    runtime.rings[at + 2] = s * AMBIENT_WAVE_INTERVAL;
    runtime.rings[at + 3] = 1;
  }
  runtime.lastSpawnIndex = k;
}

export function bindTerrainWater(
  effect: Effect,
  runtime: TerrainWaterRuntime,
  et: number,
  scene: Scene
): void {
  updateAmbientRings(runtime, et, scene);
  effect.setArray4('muWaterWaves', runtime.rings);

  if (runtime.frames.length) {
    const frame = Math.floor(et * FLIP_FPS) % runtime.frames.length;
    effect.setTexture('waterFlip', runtime.frames[frame]);
  }
}

export type AmbientRing = {
  readonly x: number;
  readonly z: number;
  readonly spawnTime: number;
};

/**
 * CPU mirror of the shader field - GetWaterTerrain's role, and what the unit
 * test pins the ported constants through. Same input, same surface.
 */
export function waterSurfaceHeight(
  x: number,
  z: number,
  t: number,
  rings: readonly AmbientRing[] = []
): number {
  let h =
    0.125 * Math.sin(t * 5 + z * 0.2 + x * 0.2) -
    0.125 * Math.sin(t * 3 + x * 0.2 + z) +
    0.0625 * Math.sin(t + z + x) -
    0.0625 * Math.sin(t * 2 + x * 2 + z * 0.6);

  for (const w of rings) {
    const age = t - w.spawnTime;
    if (age <= 0) continue;
    const d = Math.hypot(x - w.x, z - w.z);
    const front = AMBIENT_WAVE_SPEED * age;
    const band = (d - front) / 1.5;
    h +=
      (AMBIENT_WAVE_AMPLITUDE *
        Math.exp(-AMBIENT_WAVE_DAMPING * age) *
        Math.exp(-band * band) *
        Math.cos(3 * (d - front))) /
      Math.sqrt(Math.max(front, 1));
  }

  return h;
}
