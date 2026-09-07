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
 * The volumetric march: steps along the view ray, steps up the sun ray for
 * each of them, and the transmittance at which the walk gives up because
 * nothing behind it could show.
 */
const VOLUME_STEPS = 32;
const VOLUME_LIGHT_STEPS = 4;
const VOLUME_CUTOFF = 0.02;

/**
 * Step sizes, in tiles, between which the fine structure is faded out.
 *
 * A ray overhead crosses the deck in about a hundred tiles and a ray near the
 * horizon in four hundred, so with a fixed step count the step itself varies
 * by four. Past the erosion's own period the march cannot resolve what it is
 * sampling and draws the beat instead - see `muCloudDensity`.
 */
const VOLUME_DETAIL_FULL = 4;
const VOLUME_DETAIL_NONE = 11;

/** Tiles of deck a single ray will walk before it stops. A ray near the
 * horizon crosses hundreds and is haze long before that. */
const VOLUME_MAX_SPAN = 900;

/** Extinction per tile of density, and how hard the deck shades itself. */
const VOLUME_DENSITY = 0.085;
const VOLUME_SELF_SHADOW = 4.5;

/**
 * Curvature the deck is bent onto, in tiles: the radius of the shell the view
 * ray is intersected against.
 *
 * A flat deck meets a level ray at infinity, which is why the layer used to be
 * cut off at a fixed distance and faded out below 17 degrees - and in first
 * person, where the horizon sits mid-screen, that fade band is half the sky
 * and the deck read as a ceiling ending in mid-air. A shell has a horizon of
 * its own instead: the same deck is about 95 tiles away overhead and about
 * 1050 at eye level, so the clouds compress into a band as they recede and the
 * layer ends where the ground does.
 *
 * The value is not a planet's radius, which would put the deck's horizon
 * further out than the map is wide and leave the compression invisible. It is
 * picked for the 11:1 spread between the overhead and horizon distances, which
 * is what the compression is made of.
 */
const CLOUD_PLANET_RADIUS = 6000;

/**
 * Aerial perspective on the deck, in tiles: where the air starts taking the
 * clouds, how fast it takes them, and how much it can take.
 *
 * The dome is outside the G-buffer so the distance haze never touches it, and
 * without this a cloud on the skyline is drawn with the same body and contrast
 * as one overhead - the layer reads as a flat texture rather than as a deck
 * receding. Fading toward the sky already computed for that pixel is what the
 * haze does to the far terrain, with the same colour, since the profile's
 * horizon is both.
 *
 * It also stands in for a mip chain: the field is sampled with none (see
 * `clouds.ts`), and the horizon is where a cell is thinnest on screen, which
 * is exactly where this leaves the least contrast to alias.
 */
const CLOUD_AERIAL_START = 150;
const CLOUD_AERIAL_SCALE = 450;
const CLOUD_AERIAL_MAX = 0.92;

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
  const float CLOUD_R = ${CLOUD_PLANET_RADIUS.toFixed(1)};

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
   * Sky pixels only.
   */
  /** Distance along rd to the shell of radius CLOUD_R + h. Same root as below. */
  float muShellHit(vec3 rd, float h) {
    float rise = max(h - cameraPosition.y, 1.0);
    float k = rise * (2.0 * CLOUD_R + h + cameraPosition.y);
    float b = (CLOUD_R + cameraPosition.y) * rd.y;

    return k / (b + sqrt(b * b + k));
  }

  /**
   * The deck as a body rather than a sheet: the view ray is walked between the
   * shells at the deck's base and top, gathering density, and each sample is
   * lit by a short march up the sun ray through the same field.
   *
   * Front to back, so the accumulated transmittance can stop the walk once
   * nothing behind would show. Ultra only - every other tier takes the slab
   * below, unchanged.
   */
  vec4 muCloudVolume(vec3 rd, vec3 sunLit, vec3 base) {
    if (muCloudA.z <= 0.01) return vec4(0.0);

    float tBase = muShellHit(rd, muCloudB.z);
    float tTop = muShellHit(rd, muCloudB.z + muCloudB.w);

    float tIn = min(tBase, tTop);
    float tOut = max(tBase, tTop);

    if (tOut <= 0.0) return vec4(0.0);

    tIn = max(tIn, 0.0);

    // A ray near the horizon crosses far more deck than one overhead. Capping
    // the walked length keeps the step count honest and the far deck is haze
    // by then anyway.
    float span = min(tOut - tIn, ${VOLUME_MAX_SPAN.toFixed(1)});
    float step = span / ${VOLUME_STEPS}.0;

    // How much of the fine structure this ray's step can resolve.
    float detail = clamp(
      (${VOLUME_DETAIL_NONE.toFixed(1)} - step)
        / ${(VOLUME_DETAIL_NONE - VOLUME_DETAIL_FULL).toFixed(1)},
      0.0,
      1.0
    );

    // Start the walk a fraction of a step in, by pixel. Every ray sampling at
    // the same offsets puts the residual error in the same place on every one
    // of them, and a shared error is a visible band; scattered, it is noise
    // the eye reads as the deck's own texture.
    float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);

    vec3 lit = vec3(0.0);
    float trans = 1.0;

    for (int i = 0; i < ${VOLUME_STEPS}; i++) {
      if (trans < ${VOLUME_CUTOFF.toFixed(3)}) break;

      float t = tIn + (float(i) + jitter) * step;
      vec3 wp = cameraPosition + rd * t;

      float h = clamp((wp.y - muCloudB.z) / muCloudB.w, 0.0, 1.0);
      float d = muCloudDensity(wp, h, detail);

      if (d <= 0.0) continue;

      // Up the sun ray, through the deck the light had to cross to get here.
      float shade = 0.0;

      for (int j = 1; j <= ${VOLUME_LIGHT_STEPS}; j++) {
        float f = float(j) / ${VOLUME_LIGHT_STEPS}.0;
        vec3 lp = wp + vec3(muCloudB.x, 1.0, muCloudB.y) * muCloudB.w * f;
        float lh = clamp((lp.y - muCloudB.z) / muCloudB.w, 0.0, 1.0);

        shade += muCloudDensity(lp, lh, detail);
      }

      float sun = exp(-${VOLUME_SELF_SHADOW.toFixed(2)} * shade / ${VOLUME_LIGHT_STEPS}.0);

      vec3 body = mix(base * ${CLOUD_BASE_SHADE.toFixed(2)}, sunLit * ${CLOUD_LIT_GAIN.toFixed(2)}, sun);

      float take = 1.0 - exp(-d * ${VOLUME_DENSITY.toFixed(2)} * step);

      lit += body * take * trans;
      trans *= 1.0 - take;
    }

    float alpha = 1.0 - trans;
    if (alpha <= 0.001) return vec4(0.0);

    vec3 colour = lit / max(alpha, 0.001);

    float aerial = 1.0 - exp(
      -max(tIn - ${CLOUD_AERIAL_START.toFixed(1)}, 0.0) / ${CLOUD_AERIAL_SCALE.toFixed(1)}
    );

    return vec4(mix(colour, base, aerial * ${CLOUD_AERIAL_MAX.toFixed(2)}), alpha);
  }

  vec4 muCloudSlab(vec3 rd, vec3 sunLit, vec3 base) {
    if (muCloudA.z <= 0.01) return vec4(0.0);

    // Where the ray leaves a shell of radius CLOUD_R + h, the eye standing at
    // CLOUD_R + cameraPosition.y. Written as k / (b + sqrt(b * b + k)) and not
    // as -b + sqrt(b * b + k): same root, but the second subtracts two numbers
    // around 6000 to arrive at a distance of 95 and spends the mantissa doing
    // it.
    float h = muCloudB.z + muCloudB.w * 0.5;
    float rise = max(h - cameraPosition.y, 1.0);
    float k = rise * (2.0 * CLOUD_R + h + cameraPosition.y);
    float b = (CLOUD_R + cameraPosition.y) * rd.y;
    float t = k / (b + sqrt(b * b + k));
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

    // The dome is outside the G-buffer, so the distance haze never reaches it
    // and the deck has to take its own. Fading a far cloud into the sky drawn
    // behind it is what the haze does to the terrain below it, in the same
    // colour: the profile's horizon is both.
    float aerial = 1.0 - exp(
      -max(t - ${CLOUD_AERIAL_START.toFixed(1)}, 0.0) / ${CLOUD_AERIAL_SCALE.toFixed(1)}
    );

    return vec4(mix(body, base, aerial * ${CLOUD_AERIAL_MAX.toFixed(2)}), alpha);
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

    // muCloudC.z is the tier's field scale, and it is above 1 only where the
    // deck is marched. One flag, no define, no second material.
    vec4 clouds = muCloudC.z > 1.001
      ? muCloudVolume(rd, sunColor, sky)
      : muCloudSlab(rd, sunColor, sky);
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
