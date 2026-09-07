import {
  ShaderStore,
  type Effect,
  type IParticleSystem,
  type Scene,
} from '../libs/babylon/exports';
import type { RoomVolume } from '../lighting/profiles';

/**
 * Sky weather seen from inside a room: the same rule the room mask draws by
 * (`scenes/roomMask.ts`), applied to the weather's own particles.
 *
 * Standing in a room, the mask blacks every pixel except the room itself and
 * whatever the line of sight reaches through a door or a window. Particles are
 * transparent and write no depth, so the mask reads the surface *behind* a
 * flake and cannot judge the flake: snow drawn over the floor read as the
 * floor and stayed, which is snow falling indoors. That is why weather used to
 * be switched off at the door - and switching it off takes it out of the
 * doorway too, so an interior looked out on a still, dry world.
 *
 * The test here is the mask's, moved onto the particle: a flake is drawn iff
 * the segment from the camera to the flake crosses the room's wall box (a
 * clear line through an opening; a solid wall would have stopped it) and the
 * flake is not inside the room volume. That discards
 *
 *  - flakes inside the room,
 *  - flakes over the roof, and beside it, that project onto the room - the
 *    segment to them stops short of the walls,
 *
 * and keeps the flakes past the room, in the sliver of world the mask leaves
 * visible through the openings. Outdoors, and in a room the mask is not
 * drawing (Classic tier), `roomClipCam.w` is 0 and nothing is discarded.
 *
 * The shader is Babylon's own particle fragment shader with the test injected,
 * read out of the shader store rather than copied, so image processing, fog
 * and the blend modes stay exactly as the engine wrote them. Both paths are
 * covered: the CPU and GPU vertex shaders each hand the fragment stage a
 * `vPositionW`.
 */

const CPU_SHADER = 'muRoomClipParticle';
const GPU_SHADER = 'muRoomClipGpuParticle';

const UNIFORMS = ['roomClipCam', 'roomClipXZ', 'roomClipY'];

/** The room the weather is being clipped to; null outdoors. */
let clipped: RoomVolume | null = null;

/** Camera the test is run from, world space. */
const eye = { x: 0, y: 0, z: 0 };

/**
 * The active room and the eye it is judged from, set once a frame by the
 * ambient particle system. Null turns the clip off (the uniform, not the
 * shader: the systems keep the effect they were built with).
 */
export function setRoomWeatherClip(
  volume: RoomVolume | null,
  camera: { x: number; y: number; z: number }
): void {
  clipped = volume;
  eye.x = camera.x;
  eye.y = camera.y;
  eye.z = camera.z;
}

const DECLARATIONS = `
varying vec3 vPositionW;
uniform vec4 roomClipCam;  // camera world position, w = the clip is on
uniform vec4 roomClipXZ;   // minX, minZ, maxX, maxZ
uniform vec3 roomClipY;    // floor, wall top, roof underside

// Segment from o to o + d against the box; true when any part is inside.
bool roomClipCrosses(vec3 o, vec3 d, vec3 bmin, vec3 bmax) {
  vec3 inv = 1.0 / (abs(d) + vec3(1e-6)) * sign(d + vec3(1e-9));
  vec3 t0 = (bmin - o) * inv;
  vec3 t1 = (bmax - o) * inv;
  vec3 tn = min(t0, t1);
  vec3 tf = max(t0, t1);
  float tEnter = max(max(tn.x, tn.y), tn.z);
  float tExit = min(min(tf.x, tf.y), tf.z);
  return tExit >= max(tEnter, 0.0) && tEnter <= 1.0;
}

bool roomClipHidden(vec3 p) {
  vec3 volMin = vec3(roomClipXZ.x, roomClipY.x, roomClipXZ.y);
  vec3 volMax = vec3(roomClipXZ.z, roomClipY.z, roomClipXZ.w);
  vec3 wallMax = vec3(roomClipXZ.z, roomClipY.y, roomClipXZ.w);

  bool inside = all(greaterThanEqual(p, volMin)) && all(lessThanEqual(p, volMax));

  return inside || !roomClipCrosses(roomClipCam.xyz, p - roomClipCam.xyz, volMin, wallMax);
}
`;

const TEST = `
  if (roomClipCam.w > 0.5 && roomClipHidden(vPositionW)) discard;
`;

/**
 * Babylon's shader with the declarations before `main` and the test as its
 * first statement. Anchored on `void main` rather than on the CUSTOM_ hooks:
 * only the CPU shader carries those.
 */
function withClip(source: string): string | null {
  const at = source.indexOf('void main');
  if (at < 0) return null;

  const open = source.indexOf('{', at);
  if (open < 0) return null;

  return (
    source.slice(0, at) +
    DECLARATIONS +
    source.slice(at, open + 1) +
    TEST +
    source.slice(open + 1)
  );
}

/**
 * A shader that would not compile, on any system. The weather then has no
 * clip, so the caller must keep it out of rooms the old way.
 */
let broken = false;

/**
 * Whether a room's weather can be clipped at all. False turns the rule back
 * into "no sky weather under a roof", which is the only honest fallback:
 * unclipped weather in a room is snow on the tavern floor.
 */
export function roomClipAvailable(): boolean {
  return !broken && registerShaders();
}

/** Registers both clipped shaders once; false if Babylon's own are not in the store. */
function registerShaders(): boolean {
  const store = ShaderStore.ShadersStore;

  if (store[`${CPU_SHADER}PixelShader`] && store[`${GPU_SHADER}PixelShader`]) {
    return true;
  }

  const cpu = withClip(store['particlesPixelShader'] ?? '');
  const gpu = withClip(store['gpuRenderParticlesPixelShader'] ?? '');
  if (!cpu || !gpu) return false;

  store[`${CPU_SHADER}PixelShader`] = cpu;
  store[`${GPU_SHADER}PixelShader`] = gpu;

  return true;
}

export type RoomClip = {
  /** Rebuilds the effect when the system's defines move under it (post on/off). */
  refresh(): void;
  dispose(): void;
};

/**
 * Puts the clip on one weather system. The effect is rebuilt whenever the
 * system's own defines change, because a custom effect is the one thing
 * Babylon will not recompile for you.
 */
export function clipToRoom(
  scene: Scene,
  system: IParticleSystem
): RoomClip | null {
  if (!registerShaders()) return null;

  const engine = scene.getEngine();
  if (typeof engine.createEffectForParticles !== 'function') return null;

  const fragment =
    system.vertexShaderName === 'particles' ? CPU_SHADER : GPU_SHADER;

  let built = '';
  let failed = false;

  const binder = (effect: Effect | null) => {
    if (!effect) return;
    const on = clipped !== null;
    effect.setFloat4('roomClipCam', eye.x, eye.y, eye.z, on ? 1 : 0);
    if (!clipped) return;
    effect.setFloat4(
      'roomClipXZ',
      clipped.minX,
      clipped.minY,
      clipped.maxX,
      clipped.maxY
    );
    effect.setFloat3(
      'roomClipY',
      clipped.floorY,
      clipped.wallTop,
      clipped.roofY
    );
  };

  system.onBeforeDrawParticlesObservable.add(binder);

  const build = () => {
    const defines: string[] = [];
    system.fillDefines(defines, system.blendMode);
    const join = defines.join('\n');
    if (join === built) return;

    // A shader that will not compile must not take the weather with it: drop
    // back to the stock effect and stop trying.
    const effect = engine.createEffectForParticles(
      fragment,
      UNIFORMS,
      [],
      join,
      undefined,
      undefined,
      () => {
        failed = true;
        broken = true;
        system.setCustomEffect(null, 0);
      },
      system
    );

    built = join;
    system.setCustomEffect(effect, 0);
  };

  build();

  return {
    refresh: () => {
      if (!failed) build();
    },
    dispose: () => {
      system.onBeforeDrawParticlesObservable.removeCallback(binder);
    },
  };
}
