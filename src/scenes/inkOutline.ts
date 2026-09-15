import {
  Constants,
  GeometryBufferRenderer,
  PostProcess,
  ShaderStore,
  Texture,
  type ArcRotateCamera,
  type Scene,
} from '../libs/babylon/exports';
import { devQueryNumbers } from '../common/devSeams';
import type { LightingTier } from '../common/lightingQuality';
import {
  inkDarkness,
  inkSide,
  inkWidth,
  toonBands,
  toonEffectsActive,
  type RenderingStyle,
} from '../common/renderingStyle';
import { EFFECT_MASK_SAMPLER, effectMask } from './ambientOcclusion';

/**
 * Ink lines (rendering_style ARCHITECTURE §2.3): sole owner of the outline
 * post-process, between the AO combine and the haze so a line fades with
 * distance like the surface it sits on and is graded with the scene.
 *
 * The lines come from the G-buffer alone. Depth across a flat surface is not
 * linear in screen space but its reciprocal is, at whatever angle the surface
 * is seen, so the two neighbours on an axis predict the pixel between them by
 * a straight average: their second difference is zero on any flat surface,
 * positive where the pixel stands in front of what surrounds it and negative
 * where it stands behind. That is the whole silhouette test, and the line
 * placement decides which side of the step takes the line. A crease is a
 * *sudden* turn of the normal, the second difference again, counted only
 * where the depth stayed continuous: a smoothly rounded limb turns by the
 * same amount from tap to tap and draws nothing.
 *
 * Sky is depth 0: it never inks, and as a neighbour it is infinitely far.
 * The effect mask is subtracted and added back the way the haze does it, so
 * the additive half of a pixel keeps its own light.
 *
 * The line strength, line width and line placement sliders set the darkness,
 * the width and the side (renderingStyle.ts).
 *
 * With the skill effects toggle on (`toonEffectsActive`) the pass is built
 * in its second form and treats the additive half it just subtracted the
 * same way: its luminance is snapped to the shade steps, hue kept, so a
 * glow becomes a few solid tones, and where a tone meets nothing (the
 * effect's own edge, one line width out) the whole pixel takes the ink, so
 * every flash and bolt wears a contour in its own darker colour. Below the
 * first tone the glow is left as it is, a soft skirt outside the line: the
 * mask has no depth, so under a flame that dips into the ground it reports
 * more light than landed. The mask is depthless in the other direction too,
 * holding effects the frame never drew because something opaque stood in
 * front, and a pixel the frame left dimmer than the effect alone is exactly
 * that: those are left to the surface, so a contour never lands on the wall
 * in front of a flame. Off, the shader text is the one it always was.
 * Dev seam: `?inkk=depthThreshold,normalThreshold` replaces the edge thresholds.
 */

const SHADER = 'muInkOutline';

/** Tap rings per tier index; Ultra adds a second ring one texel further out. */
const RINGS: readonly number[] = [0, 1, 2];

/** A depth step counts past this share of the pixel's own depth... */
const DEPTH_THRESHOLD = 0.02;

/** ...and never under this many tiles, so a surface never inks its own texels. */
const DEPTH_FLOOR = 0.05;

/**
 * A crease counts past this much sudden turn of the normal, as the length of
 * the turn it takes between one tap and the next: about 26 degrees of change
 * in the rate, not in the normal itself.
 */
const NORMAL_THRESHOLD = 0.45;

/** Tiles over which the lines thin to nothing. */
const FAR: readonly [number, number] = [80, 160];

/** One line is one G-buffer texel at this frame height, two at twice it. */
const REFERENCE_HEIGHT = 900;

const knobsDev = devQueryNumbers('inkk', 2);

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  rings: number;
  /** The second form, flattening and contouring the effects. */
  fx: boolean;
  pass: PostProcess;
};

let runtime: Runtime | null = null;

const shown = { strength: 0 };

/** The shader's name for its tap rings and whether it treats the effects. */
function shaderName(rings: number, fx: boolean): string {
  return `${SHADER}${rings}${fx ? 'Fx' : ''}`;
}

function registerShader(rings: number, fx: boolean): void {
  const name = shaderName(rings, fx);

  if (ShaderStore.ShadersStore[`${name}FragmentShader`]) return;

  ShaderStore.ShadersStore[`${name}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform sampler2D depthSampler;    // G-buffer depth: view-space z in tiles, 0 = sky
  uniform sampler2D normalSampler;   // G-buffer normal: view space, signed, 0 at sky
  uniform sampler2D ${EFFECT_MASK_SAMPLER};
  uniform vec2 texel;      // one G-buffer texel at the reference height, in UV
  uniform float inkWidth;  // the line's width in those texels
  uniform float inkSide;   // 1 inside the silhouette, 0 across it, -1 outside
  uniform vec4 ink;        // strength, depth threshold (share of z), depth floor (tiles), normal threshold
  uniform vec2 inkFar;     // fade start, fade end (tiles)
${
  fx
    ? `
  uniform float inkFx;     // tone levels

  // The additive half's luminance at a neighbour, for the contour.
  float maskLuma(vec2 uv) {
    return dot(texture2D(${EFFECT_MASK_SAMPLER}, uv).rgb, vec3(0.299, 0.587, 0.114));
  }

  // Nearest of \`levels\` tones over [0, 1], hard edged: an effect is a flat
  // shape, not a lit surface, so nothing eases here.
  float fxBands(float x, float levels) {
    float s = max(levels - 1.0, 1.0);
    return floor(clamp(x, 0.0, 1.0) * s + 0.5) / s;
  }
`
    : ''
}
  const int RINGS = ${rings};

  // Sky stands infinitely far behind everything, which is zero the moment
  // depth is read as its reciprocal.
  float invAt(vec2 uv) {
    float z = texture2D(depthSampler, uv).r;
    return z <= 0.0 ? 0.0 : 1.0 / z;
  }

  vec3 normalAt(vec2 uv) {
    return texture2D(normalSampler, uv).xyz;
  }

  // How far this pixel stands in front of the straight line between its two
  // neighbours, in tiles. Zero on any flat surface at any angle, which is
  // what a plane predicted from the shading normal could not manage: on a
  // card whose authored normal is not its own plane, on a smoothed limb, or
  // on anything seen near edge-on, that prediction was wrong across the
  // whole surface and the pass filled it with ink instead of tracing it.
  float reliefAt(vec2 uv, vec2 reach, float inv0, float scale) {
    return (2.0 * inv0 - invAt(uv + reach) - invAt(uv - reach)) * scale;
  }

  // The silhouette, on the side the placement asks for: inside it is the
  // pixel standing in front, outside it the one standing behind.
  float sideStep(float relief, float threshold) {
    float inside = smoothstep(threshold, threshold * 2.0, relief);
    float outside = smoothstep(threshold, threshold * 2.0, -relief);
    return inkSide > 0.5 ? inside : (inkSide < -0.5 ? outside : max(inside, outside));
  }

  // A crease turns the normal suddenly. A rounded surface turns it by the
  // same amount from tap to tap, so the second difference stays near zero
  // there and only the folds draw.
  float creaseStep(vec2 uv, vec2 reach, vec3 n0, float relief, float threshold) {
    float bend = length(normalAt(uv + reach) + normalAt(uv - reach) - 2.0 * n0);
    float continuous = 1.0 - smoothstep(threshold, threshold * 2.0, abs(relief));
    return smoothstep(ink.w, ink.w * 2.0, bend) * continuous;
  }

  void main(void) {
    vec4 color = texture2D(textureSampler, vUV);
    float z0 = texture2D(depthSampler, vUV).r;

    if (${fx ? 'ink.x <= 0.0' : 'z0 <= 0.0 || ink.x <= 0.0'}) {
      gl_FragColor = color;
      return;
    }

    float edge = 0.0;

    // The geometry lines belong to matter: the sky (depth 0) draws none.
    ${fx ? 'if (z0 > 0.0)' : ''} {
      vec3 n0 = normalAt(vUV);
      float inv0 = 1.0 / z0;
      // Reciprocal depth back into tiles, to first order, so the thresholds
      // below stay the plain distances they read as.
      float scale = z0 * z0;
      float threshold = max(ink.y * z0, ink.z);
      float weight = 1.0;

      for (int r = 1; r <= RINGS; r++) {
        vec2 o = texel * (inkWidth + float(r) - 1.0);
        vec2 reachX = vec2(o.x, 0.0);
        vec2 reachY = vec2(0.0, o.y);

        float reliefX = reliefAt(vUV, reachX, inv0, scale);
        float reliefY = reliefAt(vUV, reachY, inv0, scale);

        float step2 = max(sideStep(reliefX, threshold), sideStep(reliefY, threshold));

        float crease = max(
          creaseStep(vUV, reachX, n0, reliefX, threshold),
          creaseStep(vUV, reachY, n0, reliefY, threshold));

        edge = max(edge, max(step2, crease) * weight);
        weight *= 0.5;
      }

      // Far out a line covers less than a pixel of world and reads as noise.
      edge *= 1.0 - smoothstep(inkFar.x, inkFar.y, z0);
    }

    // The depth belongs to the surface, so only the surface takes the line.
    // The additive half drawn over it keeps its own light (the haze's rule).
    // No semicolons in these comments: the shader preprocessor splits on them.
    vec3 lit = max(color.rgb, vec3(0.0));
    vec3 effect = min(texture2D(${EFFECT_MASK_SAMPLER}, vUV).rgb, lit);
    vec3 surface = color.rgb - effect;
${
  fx
    ? `
    // The mask carries every additive thing in the world, the ones the depth
    // test hid behind a wall included. An effect that did light this pixel
    // is part of what the frame holds, so a frame dimmer than the effect
    // alone is one where it landed somewhere else: leave those to the
    // surface rather than draw a contour on the wall in front of them.
    float rawL = maskLuma(vUV);
    float shownHere = step(rawL, dot(lit, vec3(0.299, 0.587, 0.114)) + 1e-4);

    // The effects, flat: from the first tone up their luminance is snapped
    // to the tone levels, hue kept, what stands above white passing through,
    // so a soft glow ends in a hard step. Below the first tone it is left as
    // it is. That step is where the contour goes: this pixel holds a tone
    // and a neighbour one line width away holds none, and the whole pixel
    // takes the ink.
    float fxLow = 0.5 / max(inkFx - 1.0, 1.0);
    float fxL = dot(effect, vec3(0.299, 0.587, 0.114));
    float fxQ = fxL < fxLow ? fxL : fxBands(min(fxL, 1.0), inkFx) + max(fxL - 1.0, 0.0);
    effect = mix(effect, fxL > 1e-4 ? effect * (fxQ / fxL) : effect, shownHere);

    vec2 fxO = texel * inkWidth;
    float fxOut = max(
      max(1.0 - step(fxLow, maskLuma(vUV + vec2(fxO.x, 0.0))),
          1.0 - step(fxLow, maskLuma(vUV - vec2(fxO.x, 0.0)))),
      max(1.0 - step(fxLow, maskLuma(vUV + vec2(0.0, fxO.y))),
          1.0 - step(fxLow, maskLuma(vUV - vec2(0.0, fxO.y)))));
    float contour = step(fxLow, fxL) * fxOut * shownHere;

    edge = max(edge, contour);
    effect *= 1.0 - contour * ink.x;
`
    : ''
}
    gl_FragColor = vec4(surface * (1.0 - edge * ink.x) + effect, color.a);
  }
  `;
}

function createPass(
  scene: Scene,
  camera: ArcRotateCamera,
  rings: number,
  fx: boolean
): PostProcess {
  registerShader(rings, fx);

  const pass = new PostProcess(
    'inkOutline',
    shaderName(rings, fx),
    ['texel', 'inkWidth', 'inkSide', 'ink', 'inkFar', ...(fx ? ['inkFx'] : [])],
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

    // A line across the step is drawn from both sides, so each side takes
    // half the slider and the line comes out the width it asks for.
    const side = inkSide();
    effect.setFloat(
      'inkWidth',
      side === 0 ? Math.max(1, Math.round(inkWidth() / 2)) : inkWidth()
    );
    effect.setFloat('inkSide', side);

    effect.setFloat4(
      'ink',
      shown.strength,
      depthThreshold,
      DEPTH_FLOOR,
      normalThreshold
    );
    effect.setFloat2('inkFar', FAR[0], FAR[1]);

    if (fx) effect.setFloat('inkFx', toonBands());
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
 * Built while the style draws lines, post is on and the AO left a G-buffer
 * and an effect mask to read. Returns true when the chain changed.
 * `upstreamChanged` (the AO was rebuilt this tick) re-attaches the pass
 * behind the new SSAO passes without rebuilding it.
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
  const wanted =
    tier !== null &&
    post &&
    style !== null &&
    style.outline &&
    effectMask() !== null;

  shown.strength = wanted ? inkDarkness() : 0;

  const rings = RINGS[tierIndex] ?? RINGS[1];
  const fx = toonEffectsActive();

  if (
    runtime &&
    (!wanted || runtime.scene !== scene || runtime.rings !== rings || runtime.fx !== fx)
  ) {
    disposeInkOutline();
    if (!wanted) return true;
  }

  if (runtime && upstreamChanged) {
    runtime.camera.detachPostProcess(runtime.pass);
    runtime.camera.attachPostProcess(runtime.pass);
    return true;
  }

  if (!wanted || runtime) return false;

  runtime = { scene, camera, rings, fx, pass: createPass(scene, camera, rings, fx) };

  return true;
}

export function inkOutlineLive(): boolean {
  return runtime !== null;
}
