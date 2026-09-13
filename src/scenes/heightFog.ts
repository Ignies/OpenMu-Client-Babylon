import {
  Constants,
  GeometryBufferRenderer,
  PostProcess,
  ShaderStore,
  Texture,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { EFFECT_MASK_SAMPLER, effectMask } from './ambientOcclusion';
import { devQueryNumber } from '../common/devSeams';
import type { LookProfile, Rgb } from '../lighting/profiles';

/**
 * The distance haze (ARCHITECTURE §4.8 step 2): sole owner of the fog
 * post-process. `f = cap x (1 - exp(-density x max(0, dist - start)))`, colour
 * the profile's horizon decoded to linear, no exposure division - the buffer
 * is linear and the tone mapper downstream sees haze and sky alike. `start`
 * sits beyond the default camera's ground reach, so the hero takes none of
 * it; a small height term is allowed for the water and snow maps.
 */

/**
 * Share of the surface's extinction the additive half of a pixel takes.
 *
 * The depth is the surface's, and an additive pass is drawn on top of its
 * background, so the emitter sits somewhere between the camera and that
 * depth and its own distance is in no buffer. A share is the estimate that
 * stays monotone in distance: zero at the camera, never more than the
 * surface's, so an emitter can never come out brighter than the ground it
 * stands on.
 *
 * This was a fixed 12 tiles, which every outdoor profile's `fog.start`
 * (20-25) already sits past, so the extinction was identically zero: a torch
 * at the map edge burned at its full HDR value over terrain the haze had
 * washed to the horizon colour, which reads as a glowing ball with nothing
 * under it. Under 1 because the share is an upper bound - rain and motes a
 * few tiles out are drawn over whatever the frame has behind them, and the
 * far ground's whole extinction would put them out.
 *
 * Dev seam: `?ehaze=<share>`.
 */
const EFFECT_HAZE_SHARE = 0.85;

const FOG_SHADER = 'muDistanceHaze';

/**
 * Where the haze stops holding anything back, in tiles.
 *
 * The cap is 0.9 so mid-distance ground keeps a tenth of its own colour and
 * does not wash out. A map is 256 tiles across, so its edge stands a couple of
 * hundred tiles off: at 250 the curve has only reached 0.75 and a quarter of
 * the far terrain survives. Under the ported camera that band is off the
 * bottom of the frame; at eye level it is the map ending in a hard silhouette
 * against the sky, plateau and all.
 *
 * Past this range the cap comes off and the ground goes into the sky it was
 * already fading toward. The ported camera looks down 48.5 degrees and its
 * topmost ray meets the ground about 20 tiles out, so no ported framing
 * reaches into this at all.
 */
const FOG_CLOSE_NEAR = 160;
const FOG_CLOSE_FAR = 320;

/** How fast the height reference follows the camera target (per second). */
const FOG_BASE_EASE = 2.5;

type Underworld = NonNullable<LookProfile['underworld']>;

const shown = {
  color: [0, 0, 0] as [number, number, number],
  start: 0,
  density: 0,
  cap: 0,
  height: 0,
  underworld: null as Underworld | null,
};

/** The underworld's colour, decoded once per sync rather than once per bind. */
const uwLinear: [number, number, number] = [0, 0, 0];

let fogBaseY = 0;
let fogBaseSeeded = false;

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  fog: PostProcess;
};

let runtime: Runtime | null = null;

const hazeDev = devQueryNumber('haze');
const effectHazeDev = devQueryNumber('ehaze');
const uwDev = devQueryNumber('uw');

/**
 * Why a pixel without depth is left alone: the G-buffer holds no blend or
 * alpha-blended mesh and no sky dome, so a card against the sky carries depth
 * 0 and there is no way from inside this shader to tell "sky" from "a card
 * against the sky". Hazing depth 0 to a horizon distance turned every card
 * against the sky into a flat grey quad and Icarus uniformly white. The dome
 * behind such a card is already the colour the haze fades to, so the card
 * blends over the horizon and nothing is missing from it.
 */
function registerFogShader(): void {
  if (ShaderStore.ShadersStore[`${FOG_SHADER}FragmentShader`]) return;

  ShaderStore.ShadersStore[`${FOG_SHADER}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform sampler2D depthSampler;
  uniform sampler2D ${EFFECT_MASK_SAMPLER};
  uniform mat4 invView;
  uniform vec2 viewport;   // tan(fov/2) * aspect, tan(fov/2)
  uniform vec3 fogColor;   // linear
  uniform vec4 fogParams;  // start, density, cap, height density
  uniform float fogBaseY;
  uniform float effectShare;
  uniform vec4 uwParams;   // top, density at top, e-folds per tile down, on
  uniform vec3 uwColor;    // linear

  const float FOG_CLOSE_NEAR = ${FOG_CLOSE_NEAR.toFixed(1)};
  const float FOG_CLOSE_FAR = ${FOG_CLOSE_FAR.toFixed(1)};

  float hazeAt(float dist, float camY, float rdY) {
    float reach = max(0.0, dist - fogParams.x);
    float y = camY + rdY * dist;
    float amount = reach * (fogParams.y + fogParams.w * exp(-max(y - fogBaseY, 0.0)));
    float f = fogParams.z * (1.0 - exp(-amount));

    // Past the map's own scale the cap comes off, so the far edge dissolves
    // into the sky instead of standing against it.
    return mix(f, 1.0, smoothstep(FOG_CLOSE_NEAR, FOG_CLOSE_FAR, dist));
  }

  /**
   * Optical depth of the underworld fog between the camera and \`dist\`: the
   * integral of \`density x exp(falloff x (top - y))\` over the part of the ray
   * that is under \`top\`, which has a closed form because the ray is a line.
   *
   * Zero above \`top\` rather than an exponential tail that never quite ends:
   * a ray leaving the camera a degree above the horizon would otherwise
   * gather thousands of tiles of that tail and the sky over the far edge
   * would come back grey.
   */
  float underworldDepth(float dist, float camY, float rdY) {
    float top = uwParams.x;
    float k = uwParams.z;

    // Nothing to collect: the ray starts over the fog and climbs away.
    if (camY > top && rdY >= 0.0) return 0.0;

    // Where it goes under, and how far it runs after that.
    float t0 = camY > top ? (top - camY) / rdY : 0.0;
    float span = max(0.0, dist - t0);

    if (span <= 0.0) return 0.0;

    // A ray a degree under the horizon goes below \`top\` too, hundreds of
    // tiles out and past the end of the map's own frame, and with nothing to
    // stop it it collects the whole integral: a black band ruled across the
    // sky at eye level. Past the map's own scale - the same range the haze
    // gives up at - this is not a hole in the ground, it is the horizon.
    float reach = 1.0 - smoothstep(FOG_CLOSE_NEAR, FOG_CLOSE_FAR, t0);

    if (reach <= 0.0) return 0.0;

    // The exponent at the entry and at the far end. Clamped because a ray
    // that meets nothing carries \`dist\` to the far plane and \`exp\` of that
    // is an infinity; the transmittance is zero long before the clamp bites,
    // so nothing anyone can see depends on where it sits.
    float a = min(k * (top - min(camY, top)), 60.0);
    float b = min(k * (top - camY - rdY * dist), 60.0);

    if (abs(rdY) < 1.0e-4) return reach * uwParams.y * exp(a) * span;

    return reach * uwParams.y * (exp(a) - exp(b)) / (k * rdY);
  }

  void main(void) {
    vec4 color = texture2D(textureSampler, vUV);
    float depth = texture2D(depthSampler, vUV).r;

    bool hazed = fogParams.y > 0.0 && depth > 0.0;

    if (!hazed && uwParams.w <= 0.0) {
      gl_FragColor = color;
      return;
    }

    vec3 viewDir = vec3((vUV.x * 2.0 - 1.0) * viewport.x, (vUV.y * 2.0 - 1.0) * viewport.y, 1.0);
    vec3 camPos = invView[3].xyz;

    // The rotation of invView, by column. Not mat3(invView): a
    // matrix-from-matrix constructor is a compile error under ESSL 1.00.
    vec3 worldDir =
      invView[0].xyz * viewDir.x +
      invView[1].xyz * viewDir.y +
      invView[2].xyz * viewDir.z;

    // A pixel with no depth is not a surface at a distance, it is a ray that
    // met nothing: the sky over the map, or - the reason any of this is here
    // - the far plane under a hole in the ground. Carried out to the far
    // plane so the underworld integral below runs the whole way.
    float dist = depth > 0.0 ? length(worldDir) * depth : 1.0e6;
    vec3 rd = normalize(worldDir);

    // The depth belongs to the surface, so only the surface may be hazed by
    // it. The mask holds the additive pass drawn over that surface, at the
    // same pixels, so the rest of the pixel is the surface itself.
    vec3 effect = min(texture2D(${EFFECT_MASK_SAMPLER}, vUV).rgb,
      max(color.rgb, vec3(0.0)));
    vec3 surface = color.rgb - effect;

    // Extinction only on the emissive half: the light scattered into the ray
    // is already added once, by the surface term.
    float f = hazed ? hazeAt(dist, camPos.y, rd.y) : 0.0;
    float fEffect = f * effectShare;

    vec3 lit = mix(surface, fogColor, f);

    // The underworld, last of the two: the haze fades a surface toward the
    // horizon and this fades what is left toward the bottom of the world, so
    // a crevasse stays dark however much air is in front of it.
    //
    // The surface only. The additive half is drawn over whatever the frame
    // had behind it and is almost always in front of this - an aurora over a
    // ravine, snow falling into one - and putting the fog through it would
    // put those out with the ground they are over.
    if (uwParams.w > 0.0) {
      float uw = 1.0 - exp(-max(underworldDepth(dist, camPos.y, rd.y), 0.0));

      lit = mix(lit, uwColor, uw);
    }

    gl_FragColor = vec4(lit + effect * (1.0 - fEffect), color.a);
  }
  `;
}

function createFog(scene: Scene, camera: ArcRotateCamera): PostProcess {
  registerFogShader();

  const fog = new PostProcess(
    'distanceHaze',
    FOG_SHADER,
    [
      'invView',
      'viewport',
      'fogColor',
      'fogParams',
      'fogBaseY',
      'effectShare',
      'uwParams',
      'uwColor',
    ],
    ['depthSampler', EFFECT_MASK_SAMPLER],
    1,
    null,
    Texture.BILINEAR_SAMPLINGMODE,
    scene.getEngine(),
    false,
    null,
    // The buffer is linear HDR: an 8-bit target here quantises everything
    // under display 0.05 to zero before the tone mapper ever sees it.
    Constants.TEXTURETYPE_HALF_FLOAT
  );

  fog.onApply = effect => {
    const mask = effectMask();
    const gbuffer = scene.geometryBufferRenderer;

    if (!mask || !gbuffer) return;

    effect.setTexture(EFFECT_MASK_SAMPLER, mask);

    const depthIndex = gbuffer.getTextureIndex(
      GeometryBufferRenderer.DEPTH_TEXTURE_TYPE
    );

    effect.setTexture('depthSampler', gbuffer.getGBuffer().textures[depthIndex]);

    effect.setMatrix('invView', camera.getViewMatrix().clone().invert());

    const tanHalf = Math.tan(camera.fov / 2);

    effect.setFloat2(
      'viewport',
      tanHalf * scene.getEngine().getAspectRatio(camera, true),
      tanHalf
    );

    effect.setFloat3('fogColor', shown.color[0], shown.color[1], shown.color[2]);
    effect.setFloat4('fogParams', shown.start, shown.density, shown.cap, shown.height);
    effect.setFloat('fogBaseY', fogBaseY);
    effect.setFloat('effectShare', effectHazeDev ?? EFFECT_HAZE_SHARE);

    const uw = shown.underworld;

    effect.setFloat4(
      'uwParams',
      uw ? uw.top : 0,
      uw ? uw.density : 0,
      uw ? Math.max(uw.falloff, 1e-3) : 1,
      uw ? 1 : 0
    );
    effect.setFloat3('uwColor', uwLinear[0], uwLinear[1], uwLinear[2]);
  };

  camera.attachPostProcess(fog);

  return fog;
}

export function disposeHeightFog(): void {
  if (!runtime) return;

  runtime.camera.detachPostProcess(runtime.fog);
  runtime.fog.dispose(runtime.camera);
  runtime = null;
}

/**
 * The live haze: built while there is a mask to read and a density to draw,
 * torn down otherwise (identity when off). Returns true when the chain
 * changed. Colour and parameters are written every call; they are cheap and
 * an area blend moves them every frame.
 */
export function syncHeightFog(
  scene: Scene,
  camera: ArcRotateCamera,
  fog: LookProfile['fog'],
  colorLinear: Rgb,
  post: boolean,
  /** The map's underworld fog, or null - see `LookProfile.underworld`. */
  underworld: Underworld | null
): boolean {
  // Dev seam: `?haze=<density>` replaces the profile's density (0 = no pass).
  const density = hazeDev ?? fog.density;

  // Dev seam: `?uw=<density>` replaces the underworld's (0 = off), which is
  // both the A/B for what it is worth and the dial for how hard it bites.
  const uwDensity = uwDev ?? underworld?.density ?? 0;

  shown.underworld =
    underworld && uwDensity > 0 ? { ...underworld, density: uwDensity } : null;

  uwLinear[0] = shown.underworld?.color[0] ?? 0;
  uwLinear[1] = shown.underworld?.color[1] ?? 0;
  uwLinear[2] = shown.underworld?.color[2] ?? 0;

  shown.color[0] = colorLinear[0];
  shown.color[1] = colorLinear[1];
  shown.color[2] = colorLinear[2];
  shown.start = fog.start;
  shown.density = density;
  shown.cap = fog.cap;
  shown.height = fog.height;

  // Either fog is reason enough for the pass: a map may have holes in its
  // ground and no haze at all.
  const want =
    post && (density > 0 || shown.underworld !== null) && effectMask() !== null;

  if (runtime && (!want || runtime.scene !== scene)) {
    disposeHeightFog();
    if (!want) return true;
  }

  if (!want || runtime) return false;

  runtime = { scene, camera, fog: createFog(scene, camera) };

  return true;
}

/**
 * Per frame: the height reference follows the camera target so the height
 * term hugs the ground around the hero instead of a fixed sea level - maps
 * step up and down by tens of tiles.
 */
export function updateHeightFog(camera: ArcRotateCamera, dt: number): void {
  const targetY = camera.target.y;

  if (!fogBaseSeeded) {
    fogBaseY = targetY;
    fogBaseSeeded = true;
    return;
  }

  const k = Math.min(1, dt * FOG_BASE_EASE);

  fogBaseY += (targetY - fogBaseY) * k;
}
