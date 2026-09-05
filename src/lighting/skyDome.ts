import {
  Mesh,
  ShaderMaterial,
  ShaderStore,
  type Scene,
} from '../libs/babylon/exports';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { linearBufferActive } from '../common/lightModel';
import { lookDirector, type LookDirector, type LookState } from './director';
import { profileFor, toLinear, type Rgb } from './profiles';

/**
 * The sky (ARCHITECTURE §4.6): sole writer of `scene.clearColor` and of the
 * sky dome mesh. Open maps on tiers >= 1 draw an inverted hemisphere past the
 * map with the profile's zenith-to-horizon gradient, unlit and untouched by
 * the haze; it gives the void beyond the map edge the colour the far terrain
 * is fading to, so the edge dissolves instead of standing as a silhouette.
 * Classic and skyless maps keep the clear colour alone.
 */

export type SkyLook = {
  /**
   * The profile's horizon, display sRGB, or null to keep the map's authored
   * bytes. Nothing lights the sky and no exposure follows it (the level lives
   * in the key, §13 F4), so the decoded value lands where it was authored.
   */
  readonly horizon: Rgb | null;
  /** The buffer is linear: decode the horizon once, here. */
  readonly linear: boolean;
  /** `SetWorldClearColor` bytes, or undefined for black. */
  readonly bytes: readonly [number, number, number] | undefined;
  /** A room is active: nothing past its walls is drawn, the void included. */
  readonly black: boolean;
};

/**
 * Dome radius in tiles: past any corner of a 256-tile map from any camera,
 * inside the camera's far plane (Babylon's default 10000), and far beyond
 * the shadow and AO ranges, so the depth it writes is always the last thing
 * behind the map.
 */
const DOME_RADIUS = 2000;

const DOME_SEGMENTS = 24;

const DOME_SHADER = 'muSkyDome';

type Dome = {
  scene: Scene;
  mesh: Mesh;
  material: ShaderMaterial;
};

let dome: Dome | null = null;

let domeScene: Scene | null = null;

let observed: LookDirector | null = null;

export function syncSkyDome(scene: Scene, look: SkyLook): void {
  domeScene = scene;
  watchDome();

  if (look.black) {
    scene.clearColor.set(0, 0, 0, 1);
    return;
  }

  if (look.horizon) {
    const c = look.linear ? toLinear(look.horizon) : look.horizon;
    scene.clearColor.set(c[0], c[1], c[2], 1);
    return;
  }

  const bytes = look.bytes;

  if (bytes) {
    scene.clearColor.set(bytes[0] / 256, bytes[1] / 256, bytes[2] / 256, 1);
  } else {
    scene.clearColor.set(0, 0, 0, 1);
  }
}

/**
 * The dome follows the published look: it needs the map's zenith as well as
 * the horizon the clear colour is handed, and the tier and the room, all of
 * which are in `LookState` and in its change signature.
 */
function watchDome(): void {
  const director = lookDirector();
  if (!director || director === observed) return;

  observed = director;
  director.onChange.add(syncDomeMesh);
}

function syncDomeMesh(state: Readonly<LookState>): void {
  const scene = domeScene;
  const sky =
    scene && state.tier > 0 && !state.area ? profileFor(state.world).sky : null;

  if (!sky || !scene) {
    disposeSkyDome();
    return;
  }

  if (dome && (dome.scene !== scene || dome.mesh.isDisposed())) {
    disposeSkyDome();
  }

  dome ??= createDome(scene);

  const linear = linearBufferActive(scene);
  const zenith = linear ? toLinear(sky.zenith) : sky.zenith;
  const horizon = linear ? toLinear(sky.horizon) : sky.horizon;

  dome.material.setArray3('zenith', [zenith[0], zenith[1], zenith[2]]);
  dome.material.setArray3('horizon', [horizon[0], horizon[1], horizon[2]]);
}

export function disposeSkyDome(): void {
  if (!dome) return;

  dome.mesh.dispose(false, true);
  dome = null;
}

function registerDomeShader(): void {
  if (ShaderStore.ShadersStore[`${DOME_SHADER}VertexShader`]) return;

  ShaderStore.ShadersStore[`${DOME_SHADER}VertexShader`] = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  varying float vUp;

  void main(void) {
    vUp = normalize(position).y;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
  `;

  ShaderStore.ShadersStore[`${DOME_SHADER}FragmentShader`] = `
  precision highp float;
  varying float vUp;
  uniform vec3 zenith;
  uniform vec3 horizon;

  void main(void) {
    gl_FragColor = vec4(mix(horizon, zenith, clamp(vUp, 0.0, 1.0)), 1.0);
  }
  `;
}

function createDome(scene: Scene): Dome {
  registerDomeShader();

  const mesh = new Mesh('skyDome', scene);

  CreateSphereVertexData({
    segments: DOME_SEGMENTS,
    diameter: DOME_RADIUS * 2,
    slice: 0.5,
    sideOrientation: Mesh.BACKSIDE,
  }).applyToMesh(mesh);

  const material = new ShaderMaterial(
    'skyDome',
    scene,
    DOME_SHADER,
    {
      attributes: ['position'],
      uniforms: ['worldViewProjection', 'zenith', 'horizon'],
    }
  );

  material.backFaceCulling = false;
  mesh.material = material;

  // Rides with the camera, always in view, first group. No metadata on
  // purpose: the G-buffer, the effect mask and the cascades admit meshes by
  // their flags, so the sky is in none of them and the haze leaves it alone.
  mesh.infiniteDistance = true;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.renderingGroupId = 0;
  mesh.isPickable = false;
  mesh.receiveShadows = false;
  mesh.doNotSyncBoundingInfo = true;

  return { scene, mesh, material };
}
