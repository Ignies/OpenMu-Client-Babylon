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
 * The distance the additive half of a pixel is hazed at, in tiles, when the
 * depth behind it says further. A flame is drawn on top of its background so
 * it is never further away than the depth says; min() can only take haze
 * away. Roughly "standing where the player is": near fire keeps the haze it
 * had, far fire is hazed as something at arm's length rather than as the
 * water behind it. Cancelling it outright reads as a sticker laid over the
 * frame - the atmosphere does real work softening MU's additive smears.
 */
const EFFECT_FOG_DISTANCE = 12;

const FOG_SHADER = 'muDistanceHaze';

/** How fast the height reference follows the camera target (per second). */
const FOG_BASE_EASE = 2.5;

const shown = {
  color: [0, 0, 0] as [number, number, number],
  start: 0,
  density: 0,
  cap: 0,
  height: 0,
};

let fogBaseY = 0;
let fogBaseSeeded = false;

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  fog: PostProcess;
};

let runtime: Runtime | null = null;

const hazeDev = devQueryNumber('haze');

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

  const float EFFECT_FOG_DISTANCE = ${EFFECT_FOG_DISTANCE.toFixed(1)};

  float hazeAt(float dist, float camY, float rdY) {
    float reach = max(0.0, dist - fogParams.x);
    float y = camY + rdY * dist;
    float amount = reach * (fogParams.y + fogParams.w * exp(-max(y - fogBaseY, 0.0)));

    return fogParams.z * (1.0 - exp(-amount));
  }

  void main(void) {
    vec4 color = texture2D(textureSampler, vUV);
    float depth = texture2D(depthSampler, vUV).r;

    if (fogParams.y <= 0.0 || depth <= 0.0) {
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

    float dist = length(worldDir) * depth;
    vec3 rd = normalize(worldDir);

    // The depth belongs to the surface, so only the surface may be hazed by
    // it. The mask holds the additive pass drawn over that surface, at the
    // same pixels, so the rest of the pixel is the surface itself.
    vec3 effect = min(texture2D(${EFFECT_MASK_SAMPLER}, vUV).rgb,
      max(color.rgb, vec3(0.0)));
    vec3 surface = color.rgb - effect;

    // Extinction only on the emissive half: the light scattered into the ray
    // is already added once, by the surface term.
    float f = hazeAt(dist, camPos.y, rd.y);
    float fEffect = hazeAt(min(dist, EFFECT_FOG_DISTANCE), camPos.y, rd.y);

    gl_FragColor = vec4(mix(surface, fogColor, f) + effect * (1.0 - fEffect), color.a);
  }
  `;
}

function createFog(scene: Scene, camera: ArcRotateCamera): PostProcess {
  registerFogShader();

  const fog = new PostProcess(
    'distanceHaze',
    FOG_SHADER,
    ['invView', 'viewport', 'fogColor', 'fogParams', 'fogBaseY'],
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
  post: boolean
): boolean {
  // Dev seam: `?haze=<density>` replaces the profile's density (0 = no pass).
  const density = hazeDev ?? fog.density;

  shown.color[0] = colorLinear[0];
  shown.color[1] = colorLinear[1];
  shown.color[2] = colorLinear[2];
  shown.start = fog.start;
  shown.density = density;
  shown.cap = fog.cap;
  shown.height = fog.height;

  const want = post && density > 0 && effectMask() !== null;

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
