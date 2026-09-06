import {
  Mesh,
  ShaderMaterial,
  ShaderStore,
  type Scene,
} from '../libs/babylon/exports';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { linearBufferActive } from '../common/lightModel';
import { lookDirector, type LookDirector, type LookState } from './director';
import {
  bindClouds,
  cloudFieldGlsl,
  CLOUD_NOISE_SAMPLER,
  CLOUD_UNIFORMS,
} from './clouds';
import {
  profileFor,
  toLinear,
  SKY_CLOUDS_DEFAULT,
  SKY_CURVE_DEFAULT,
  SKY_HALO_DEFAULT,
  SKY_SUN_DEFAULT,
  type Rgb,
  type SkyLook,
} from './profiles';

/**
 * The sky (ARCHITECTURE §4.6): sole writer of `scene.clearColor` and of the
 * sky dome mesh. Open maps on tiers >= 1 draw an inverted hemisphere past the
 * map with the profile's zenith-to-horizon gradient, unlit and untouched by
 * the haze; it gives the void beyond the map edge the colour the far terrain
 * is fading to, so the edge dissolves instead of standing as a silhouette.
 * Classic and skyless maps keep the clear colour alone.
 */

export type ClearLook = {
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

/**
 * The disc in linear, above the bloom threshold (scene white) so the pass and
 * nothing else gives it its glare.
 */
const DISC_GAIN = 8;

/** The sun's angular radius and the soft edge around it, degrees. */
const DISC_RADIUS_DEG = 0.55;
const DISC_EDGE_DEG = 0.35;

/**
 * Samples taken up the sun ray to shade a cloud. They are what the depth is
 * made of, and they are all the marching there is: the shape itself is read
 * once (see `muCloudSlab`).
 */
const CLOUD_LIGHT_STEPS = 4;

/**
 * The slab's tonal range, which is the whole of whether a cloud reads as a
 * body or as a stain on the dome.
 *
 * `LIT_GAIN` lifts a sunlit top above the sky it sits in - a cloud that is not
 * brighter than the sky behind it is a smudge - and `BASE_SHADE` is what the
 * underside keeps, lit by the sky beneath it rather than by the sun.
 * `SELF_SHADOW` is how hard the deck standing overhead cuts the sun on the way
 * down, so the shading follows the shape instead of a fixed gradient.
 */
const CLOUD_LIT_GAIN = 1.35;
const CLOUD_BASE_SHADE = 0.5;
const CLOUD_SELF_SHADOW = 3.2;

/** Optical depth a fully covered ray gathers: how solid a thick cloud reads. */
const CLOUD_DENSITY = 5;

/**
 * Where the deck fades out toward the horizon, as `rd.y`: gone below about 5
 * degrees, full above about 17. Under that the ray-to-plane intersection runs
 * away and one cloud smears across the whole skyline.
 */
const CLOUD_HORIZON_FADE = [0.09, 0.3] as const;

/**
 * How far along a ray the deck is still drawn, in tiles. Past this the
 * intersection with the cloud plane grows without bound and one noise texel
 * would cover the whole skyline.
 */
const CLOUD_FAR = 700;

type Dome = {
  scene: Scene;
  mesh: Mesh;
  material: ShaderMaterial;
};

let dome: Dome | null = null;

let domeScene: Scene | null = null;

let observed: LookDirector | null = null;

export function syncSkyDome(scene: Scene, look: ClearLook): void {
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
    // Display-authored like the horizon (SetWorldClearColor bytes): one decode
    // for the linear buffer, so the void lands where the map put it.
    const c: Rgb = [bytes[0] / 256, bytes[1] / 256, bytes[2] / 256];
    const lin = look.linear ? toLinear(c) : c;
    scene.clearColor.set(lin[0], lin[1], lin[2], 1);
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

const DEG = Math.PI / 180;

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
  const decode = (c: Rgb): Rgb => (linear ? toLinear(c) : c);

  const zenith = decode(sky.zenith);
  const horizon = decode(sky.horizon);
  // A map with no disc (overcast, snowfall) keeps the halo off too; the
  // colour still feeds the cloud lighting, so it falls back to the zenith.
  const disc = sky.sun === null ? null : decode(sky.sun ?? SKY_SUN_DEFAULT);

  dome.material.setArray3('zenith', [zenith[0], zenith[1], zenith[2]]);
  dome.material.setArray3('horizon', [horizon[0], horizon[1], horizon[2]]);
  dome.material.setArray3(
    'sunColor',
    disc ? [disc[0], disc[1], disc[2]] : [zenith[0], zenith[1], zenith[2]]
  );

  const d = state.key.direction;
  const norm = 1 / (Math.hypot(d[0], d[1], d[2]) || 1);
  dome.material.setArray3('sunDir', [d[0] * norm, d[1] * norm, d[2] * norm]);

  const outer = Math.cos((DISC_RADIUS_DEG + DISC_EDGE_DEG) * DEG);
  const inner = Math.cos(DISC_RADIUS_DEG * DEG);

  dome.material.setArray4('skyParams', [
    sky.curve ?? SKY_CURVE_DEFAULT,
    disc ? sky.halo ?? SKY_HALO_DEFAULT : 0,
    disc ? outer : 2,
    disc ? inner : 2,
  ]);

  domeSky = sky;
}

/** The sky the dome is drawing, for the per-frame cloud binding. */
let domeSky: SkyLook | null = null;

/**
 * The cloud field moves every frame while the profile does not, so it is
 * bound per draw rather than on the director's change signature.
 */
function bindDomeClouds(scene: Scene, state: Readonly<LookState> | null): void {
  const effect = dome?.material.getEffect();

  if (!effect || !domeSky || !state) return;

  bindClouds(effect, scene, {
    base: domeSky.clouds ?? SKY_CLOUDS_DEFAULT,
    sunDirection: state.key.direction,
    sunElevationDeg: state.profile.sun.elevationDeg,
  });
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
  varying vec3 vDir;

  void main(void) {
    // The dome rides the camera (infiniteDistance) and has no rotation of its
    // own, so its local position normalised is the world view direction.
    vDir = normalize(position);
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
  `;

  ShaderStore.ShadersStore[`${DOME_SHADER}FragmentShader`] = `
  precision highp float;
  varying vec3 vDir;
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  uniform vec4 skyParams;   // curve, halo strength, disc cos outer, disc cos inner
  uniform vec3 cameraPosition;

${cloudFieldGlsl()}

  const int CLOUD_LIGHT_STEPS = ${CLOUD_LIGHT_STEPS};

  /**
   * A cloud's shape is read **once**, where the ray meets the middle of the
   * deck. Marching the shape through the slab instead drew the same field at
   * several different distances, and at anything but straight up those
   * intersections land far apart: what it produced was five offset copies of
   * one cloud, fanning out into the vertical streaks that made the sky look
   * like a stack of transparencies.
   *
   * The depth comes from the light march. Samples are stepped up the *sun*
   * ray from the cloud's base toward its top, which is how much of the deck
   * stands between this point and the sun. Those offsets are small and all in
   * one direction, so they shade the body rather than duplicating it: a face
   * turned to the sun comes out bright, a deep interior dark, and the edges
   * stay thin.
   *
   * Sky pixels only, and nothing at or below the horizon, where the plane
   * intersection runs away.
   */
  vec4 muCloudSlab(vec3 rd, vec3 sunLit, vec3 base) {
    if (muCloudA.z <= 0.01) return vec4(0.0);

    // A ray at the horizon meets the deck at infinity, which smears one noise
    // texel across the whole skyline. The rise is floored and the reach
    // capped, so the layer ends at a distance and the fade below carries it
    // into the horizon instead.
    float up = max(rd.y, 0.06);
    float h = muCloudB.z + muCloudB.w * 0.5;
    float t = min((h - cameraPosition.y) / up, ${CLOUD_FAR.toFixed(1)});
    vec2 p = cameraPosition.xz + rd.xz * t;

    float d = muCloudCover(p);
    if (d <= 0.0) return vec4(0.0);

    float shadow = 0.0;

    for (int i = 1; i <= CLOUD_LIGHT_STEPS; i++) {
      float f = float(i) / float(CLOUD_LIGHT_STEPS);
      shadow += muCloudCover(p + muCloudB.xy * muCloudB.w * f);
    }

    float lit = exp(-${CLOUD_SELF_SHADOW.toFixed(2)} * shadow / float(CLOUD_LIGHT_STEPS));

    vec3 body = mix(
      base * ${CLOUD_BASE_SHADE.toFixed(2)},
      sunLit * ${CLOUD_LIT_GAIN.toFixed(2)},
      lit
    );

    float alpha = 1.0 - exp(-${CLOUD_DENSITY.toFixed(2)} * d);

    // The deck ends well above the horizon. A ray approaching level meets the
    // cloud plane further and further out, so a single screen column spans an
    // enormous stretch of the field: the last few degrees of sky smeared one
    // cloud into the vertical bars that stood over every skyline. Nothing is
    // drawn there now, which is also where a real sky has its haze.
    return vec4(body, alpha * smoothstep(${CLOUD_HORIZON_FADE[0].toFixed(3)}, ${CLOUD_HORIZON_FADE[1].toFixed(3)}, rd.y));
  }

  void main(void) {
    vec3 rd = normalize(vDir);
    float up = clamp(rd.y, 0.0, 1.0);

    vec3 sky = mix(horizon, zenith, pow(up, skyParams.x));

    float sd = dot(rd, -sunDir);

    // One forward lobe for the glow and a hard disc inside it. The disc is
    // above scene white so bloom, and nothing else, gives it its glare.
    sky += sunColor * skyParams.y * pow(max(sd, 0.0), 120.0);
    sky += sunColor * ${DISC_GAIN.toFixed(1)} * smoothstep(skyParams.z, skyParams.w, sd);

    vec4 clouds = muCloudSlab(rd, sunColor, sky);
    sky = mix(sky, clouds.rgb, clouds.a);

    gl_FragColor = vec4(sky, 1.0);
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

  const material = new ShaderMaterial('skyDome', scene, DOME_SHADER, {
    attributes: ['position'],
    uniforms: [
      'worldViewProjection',
      'cameraPosition',
      'zenith',
      'horizon',
      'sunColor',
      'sunDir',
      'skyParams',
      ...CLOUD_UNIFORMS,
    ],
    samplers: [CLOUD_NOISE_SAMPLER],
  });

  material.backFaceCulling = false;
  mesh.material = material;

  material.onBindObservable.add(() => {
    bindDomeClouds(scene, lookDirector()?.state() ?? null);
  });

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
