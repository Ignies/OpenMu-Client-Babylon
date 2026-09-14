import {
  Constants,
  GeometryBufferRenderer,
  PostProcess,
  ShaderStore,
  Texture,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { devQueryNumber, devQueryNumbers } from '../common/devSeams';
import type { LightingTier } from '../common/lightingQuality';
import {
  OUTLINE_STRENGTH_MAX,
  outlineStrength,
  type RenderingStyle,
} from '../common/renderingStyle';
import { EFFECT_MASK_SAMPLER, effectMask } from './ambientOcclusion';

/**
 * Ink lines (rendering_style ARCHITECTURE §2.3): sole owner of the outline
 * post-process, between the AO combine and the haze so a line fades with
 * distance like the surface it sits on and is graded with the scene.
 *
 * The lines come from the G-buffer alone. A pixel takes a line when a
 * neighbour lies farther than the plane through the pixel predicts (a
 * silhouette, drawn on its near side only, so one texel of offset is one
 * texel of line) or when the normal turns while the depth stays on the plane
 * (a crease). The plane test is what keeps a floor at a grazing angle clean:
 * its depth changes fast, and the plane predicts that change exactly. Sky is
 * depth 0: it never inks, and as a neighbour it is the farthest thing there
 * is. The effect mask is subtracted and added back the way the haze does it,
 * so the additive half of a pixel keeps its own light.
 *
 * Dev seams: `?ink=0..9` replaces the slider (0 = no pass),
 * `?inkk=depthThreshold,normalThreshold` the edge thresholds.
 */

const SHADER = 'muInkOutline';

/** Tap rings per tier index; Ultra adds a second ring at twice the offset. */
const RINGS: readonly number[] = [0, 1, 2];

/** Darkness at the top slider notch. */
const INK_MAX = 0.9;

/** A depth step counts past this share of the pixel's own depth... */
const DEPTH_THRESHOLD = 0.02;

/** ...and never under this many tiles, so a surface never inks its own texels. */
const DEPTH_FLOOR = 0.05;

/** A crease counts past this much normal turn (1 - cos), about 63 degrees. */
const NORMAL_THRESHOLD = 0.45;

/** Tiles over which the lines thin to nothing. */
const FAR: readonly [number, number] = [80, 160];

/** One line is one G-buffer texel at this frame height, two at twice it. */
const REFERENCE_HEIGHT = 900;

const inkDev = devQueryNumber('ink');
const knobsDev = devQueryNumbers('inkk', 2);

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  rings: number;
  pass: PostProcess;
};

let runtime: Runtime | null = null;

const shown = { strength: 0 };

function registerShader(rings: number): void {
  const name = `${SHADER}${rings}`;

  if (ShaderStore.ShadersStore[`${name}FragmentShader`]) return;

  ShaderStore.ShadersStore[`${name}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform sampler2D depthSampler;    // G-buffer depth: view-space z in tiles, 0 = sky
  uniform sampler2D normalSampler;   // G-buffer normal: view space, signed, 0 at sky
  uniform sampler2D ${EFFECT_MASK_SAMPLER};
  uniform vec2 texel;      // one line width in G-buffer UV
  uniform vec2 viewport;   // tan(fov/2) * aspect, tan(fov/2)
  uniform vec4 ink;        // strength, depth threshold (share of z), depth floor (tiles), normal threshold (1 - cos)
  uniform vec2 inkFar;     // fade start, fade end (tiles)

  const int RINGS = ${rings};
  const float SKY_Z = 1.0e6;

  vec3 rayAt(vec2 uv) {
    return vec3((uv.x * 2.0 - 1.0) * viewport.x, (uv.y * 2.0 - 1.0) * viewport.y, 1.0);
  }

  // Sky is depth 0 and stands behind everything: as a neighbour it is the
  // farthest thing there is.
  float depthAt(vec2 uv) {
    float z = texture2D(depthSampler, uv).r;
    return z <= 0.0 ? SKY_Z : z;
  }

  // What the plane through this pixel says the neighbour's depth should be.
  // abs() because a front face's view-space normal has negative z and a back
  // face's positive.
  float expectedDepth(vec2 uv, vec3 n, float zPlane) {
    return zPlane / max(abs(dot(n, rayAt(uv))), 0.05);
  }

  // The line goes on the near side only: this pixel inks when its neighbour
  // is farther than the plane predicts.
  float depthStep(vec2 uv, vec3 n, float zPlane, float threshold) {
    return smoothstep(threshold, threshold * 2.0, depthAt(uv) - expectedDepth(uv, n, zPlane));
  }

  // A crease: the normal turns while the depth stays on the plane. A normal
  // change across a depth step is that step's silhouette and is left to
  // depthStep.
  float creaseStep(vec2 uv, vec3 n, float zPlane, float threshold) {
    float off = abs(depthAt(uv) - expectedDepth(uv, n, zPlane));
    float continuous = 1.0 - smoothstep(threshold, threshold * 2.0, off);
    float turn = 1.0 - dot(n, texture2D(normalSampler, uv).xyz);
    return smoothstep(ink.w, ink.w * 2.0, turn) * continuous;
  }

  void main(void) {
    vec4 color = texture2D(textureSampler, vUV);
    float z0 = texture2D(depthSampler, vUV).r;

    if (z0 <= 0.0 || ink.x <= 0.0) {
      gl_FragColor = color;
      return;
    }

    vec3 n0 = texture2D(normalSampler, vUV).xyz;
    float zPlane = z0 * abs(dot(n0, rayAt(vUV)));
    float threshold = max(ink.y * z0, ink.z);

    float edge = 0.0;
    float weight = 1.0;

    for (int r = 1; r <= RINGS; r++) {
      vec2 o = texel * float(r);

      float step4 = max(
        max(depthStep(vUV + vec2(o.x, 0.0), n0, zPlane, threshold),
            depthStep(vUV - vec2(o.x, 0.0), n0, zPlane, threshold)),
        max(depthStep(vUV + vec2(0.0, o.y), n0, zPlane, threshold),
            depthStep(vUV - vec2(0.0, o.y), n0, zPlane, threshold)));

      float crease = max(
        creaseStep(vUV + vec2(o.x, 0.0), n0, zPlane, threshold),
        creaseStep(vUV + vec2(0.0, o.y), n0, zPlane, threshold));

      edge = max(edge, max(step4, crease) * weight);
      weight *= 0.5;
    }

    // Far out a line covers less than a pixel of world and reads as noise.
    edge *= 1.0 - smoothstep(inkFar.x, inkFar.y, z0);

    // The depth belongs to the surface, so only the surface takes the line.
    // The additive half drawn over it keeps its own light (the haze's rule).
    // No semicolons in these comments: the shader preprocessor splits on them.
    vec3 effect = min(texture2D(${EFFECT_MASK_SAMPLER}, vUV).rgb, max(color.rgb, vec3(0.0)));
    vec3 surface = color.rgb - effect;

    gl_FragColor = vec4(surface * (1.0 - edge * ink.x) + effect, color.a);
  }
  `;
}

function createPass(
  scene: Scene,
  camera: ArcRotateCamera,
  rings: number
): PostProcess {
  registerShader(rings);

  const pass = new PostProcess(
    'inkOutline',
    `${SHADER}${rings}`,
    ['texel', 'viewport', 'ink', 'inkFar'],
    ['depthSampler', 'normalSampler', EFFECT_MASK_SAMPLER],
    1,
    null,
    Texture.BILINEAR_SAMPLINGMODE,
    scene.getEngine(),
    false,
    null,
    Constants.TEXTURETYPE_HALF_FLOAT
  );

  const [depthThreshold, normalThreshold] = knobsDev ?? [
    DEPTH_THRESHOLD,
    NORMAL_THRESHOLD,
  ];

  pass.onApply = effect => {
    const gbuffer = scene.geometryBufferRenderer;
    const mask = effectMask();
    if (!gbuffer || !mask) return;

    const target = gbuffer.getGBuffer();

    effect.setTexture(
      'depthSampler',
      target.textures[
        gbuffer.getTextureIndex(GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)
      ]
    );
    effect.setTexture(
      'normalSampler',
      target.textures[
        gbuffer.getTextureIndex(GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)
      ]
    );
    effect.setTexture(EFFECT_MASK_SAMPLER, mask);

    // Integer texels: a fractional offset would blend depths across the very
    // edge the line is looking for.
    const width = target.getRenderWidth();
    const height = target.getRenderHeight();
    const px = Math.max(1, Math.round(height / REFERENCE_HEIGHT));
    effect.setFloat2('texel', px / width, px / height);

    const tanHalf = Math.tan(camera.fov / 2);
    effect.setFloat2(
      'viewport',
      tanHalf * scene.getEngine().getAspectRatio(camera, true),
      tanHalf
    );
    effect.setFloat4(
      'ink',
      shown.strength,
      depthThreshold,
      DEPTH_FLOOR,
      normalThreshold
    );
    effect.setFloat2('inkFar', FAR[0], FAR[1]);
  };

  camera.attachPostProcess(pass);

  return pass;
}

export function disposeInkOutline(): void {
  if (!runtime) return;

  runtime.camera.detachPostProcess(runtime.pass);
  runtime.pass.dispose(runtime.camera);
  runtime = null;
}

/**
 * Built while the style draws lines, post is on, the slider is above zero and
 * the AO left a G-buffer and an effect mask to read. Returns true when the
 * chain changed. `upstreamChanged` (the AO was rebuilt this tick) re-attaches
 * the pass behind the new SSAO passes without rebuilding it.
 */
export function syncInkOutline(
  scene: Scene,
  camera: ArcRotateCamera,
  tier: LightingTier | null,
  tierIndex: number,
  style: RenderingStyle | null,
  post: boolean,
  upstreamChanged: boolean
): boolean {
  const slider = Math.max(
    0,
    Math.min(OUTLINE_STRENGTH_MAX, inkDev ?? outlineStrength())
  );

  const wanted =
    tier !== null &&
    post &&
    style !== null &&
    style.outline &&
    slider > 0 &&
    effectMask() !== null;

  shown.strength = wanted ? (slider / OUTLINE_STRENGTH_MAX) * INK_MAX : 0;

  const rings = RINGS[tierIndex] ?? RINGS[1];

  if (runtime && (!wanted || runtime.scene !== scene || runtime.rings !== rings)) {
    disposeInkOutline();
    if (!wanted) return true;
  }

  if (runtime && upstreamChanged) {
    runtime.camera.detachPostProcess(runtime.pass);
    runtime.camera.attachPostProcess(runtime.pass);
    return true;
  }

  if (!wanted || runtime) return false;

  runtime = { scene, camera, rings, pass: createPass(scene, camera, rings) };

  return true;
}

export function inkOutlineLive(): boolean {
  return runtime !== null;
}
