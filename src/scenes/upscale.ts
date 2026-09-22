import {
  Constants,
  EffectRenderer,
  EffectWrapper,
  PostProcess,
  RenderTargetTexture,
  ShaderStore,
  Texture,
  type AbstractEngine,
  type ArcRotateCamera,
  type Observer,
  type Scene,
} from '../libs/babylon/exports';
import { GameOptions } from '../common/gameOptions';
import { devQueryNumber } from '../common/devSeams';
import { pipelineSamples } from '../common/lightingQuality';
import { renderScaleForStep, renderScaleSeam } from '../libs/renderScale';

/**
 * The render upscale (documentation/render_upscale/ARCHITECTURE.md): draw the
 * world at the render-scale slider's share of the window and present it at the
 * window's own resolution, through FidelityFX Super Resolution 1.0 instead of
 * the browser's stretch of a small canvas.
 *
 * Sole owner of everything this adds: the target the camera renders into, the
 * pass that sets the resolution the scene is drawn at, the two passes that
 * present, and the one number the rest of the frame needs from them -
 * `sceneRenderSize`, the size the frame is drawn at, which is no longer the
 * size of the drawing buffer.
 *
 * How the resolution is set, because none of it is obvious. Babylon sizes a
 * post-process target as `source * ratio` (`postProcess.js:584`), where the
 * source is the camera's output render target, or the screen when there is
 * none - it is *not* the pass before it, so a chain of ratio-1 passes is a
 * chain at screen size whatever the pass in front of it did. Two things
 * together move the whole frame down to the scale:
 *
 *  - `camera.outputRenderTarget` at the reduced size, which every pass on the
 *    camera then sizes itself from, and which the last of them writes into.
 *    The AO, the ink lines, the haze, the room mask, the shafts, the tone
 *    curve and the rendering pipeline all follow it without being told.
 *  - An entry pass at ratio `scale`, first on the camera, because the *scene*
 *    is rendered into the first pass's target and that one is sized against
 *    the screen rather than against the output target (`scene.js:3690` passes
 *    no source). Without it the world would be drawn at full size and thrown
 *    away into a small buffer.
 *
 * Presenting is then ours to do: the camera's output never reaches the screen
 * on its own, so EASU and RCAS run from `onAfterRenderObservable` and draw the
 * reduced frame onto the drawing buffer at its full size.
 *
 * `libs/renderScale.ts` keeps doing the other thing - shrinking the drawing
 * buffer itself - whenever this is off. The two are exclusive and `boot.tsx`
 * is where they are chosen between.
 *
 * Seam: `?upscale=0` forces it off, `?upscale=1` on.
 */

const ENTRY_SHADER = 'muUpscaleEntry';
const EASU_SHADER = 'muUpscaleEasu';
const RCAS_SHADER = 'muUpscaleRcas';

const seamDev = devQueryNumber('upscale');

/**
 * `?rcas=<stops>` for the A/B: the lobe as `2^-stops`, so 0 is the sharpest
 * the filter goes and every stop halves it. Below zero skips the pass and the
 * reconstruction presents on its own.
 */
const rcasDev = devQueryNumber('rcas');

/**
 * How hard RCAS is allowed to push, as the share of the resolution the scale
 * threw away. Not a look and not a slider - the chain already has a sharpen
 * slider over the whole frame; this one gives back what the downscale took,
 * and how much that is depends on how far down it went.
 *
 * Measured against the native frame in Lorencia at 1600x900, mean |Laplacian|
 * over a fixed ground crop (native 0.0306): 0.5 lands at 0.0324, 0.6 at
 * 0.0330, 0.75 at 0.0311. A fixed lobe cannot do that - the one that suits
 * 0.5 leaves 0.75 over-sharpened by 60 %.
 */
function rcasSharpness(scale: number): number {
  return rcasDev !== null ? 2 ** -rcasDev : 1 - scale;
}

/** The scale the slider (or the `?scale=` seam) is asking for. */
function wantedScale(): number {
  return renderScaleSeam() ?? renderScaleForStep(GameOptions.renderScale);
}

/**
 * Live only below native: at 1 there is nothing to upscale, so the option is
 * inert and not a single target is built.
 */
export function upscaleLive(): boolean {
  const on = seamDev !== null ? seamDev !== 0 : GameOptions.upscale > 0;

  return on && wantedScale() < 1;
}

/** What the scene is drawn at, as a share of the drawing buffer. 1 when off. */
export function upscaleScale(): number {
  return upscaleLive() ? wantedScale() : 1;
}

/**
 * The size of the frame the scene is drawn into, by the same arithmetic
 * Babylon uses for the entry pass's target. Readers that need the frame's own
 * size ask this; `getRenderWidth(true)` is the drawing buffer and is larger
 * while this is on.
 */
export function sceneRenderSize(engine: AbstractEngine): {
  width: number;
  height: number;
} {
  const scale = upscaleScale();

  return {
    width: Math.max(1, (engine.getRenderWidth(true) * scale) | 0),
    height: Math.max(1, (engine.getRenderHeight(true) * scale) | 0),
  };
}

function registerEntryShader(): void {
  if (ShaderStore.ShadersStore[`${ENTRY_SHADER}FragmentShader`]) return;

  // Nothing but a copy. Its job is its *ratio*: it is the first pass on the
  // camera, so its target is what the scene is drawn into.
  ShaderStore.ShadersStore[`${ENTRY_SHADER}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;

  void main(void) {
    gl_FragColor = texture2D(textureSampler, vUV);
  }
  `;
}

/**
 * EASU. Twelve taps around the destination pixel; the local gradient gives a
 * direction and a strength, and the windowed lanczos kernel is stretched along
 * that direction, so an edge is resampled along itself and not across it.
 * Green stands in for luminance, as it does in the original.
 */
const EASU_FRAGMENT = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform vec2 inputSize;
  uniform vec2 rcpInput;

  vec3 tap(vec2 px) {
    return texture2D(textureSampler, px * rcpInput).rgb;
  }

  // One quadrant's contribution to the direction and its strength. lC is the
  // pixel the quadrant is centred on, lA/lB/lD/lE its four neighbours.
  void easuSet(
    inout vec2 dir,
    inout float len,
    float w,
    float lA,
    float lB,
    float lC,
    float lD,
    float lE
  ) {
    float dc = lD - lC;
    float cb = lC - lB;
    float lenX = 1.0 / max(max(abs(dc), abs(cb)), 1e-5);
    float dirX = lD - lB;
    dir.x += dirX * w;
    lenX = clamp(abs(dirX) * lenX, 0.0, 1.0);
    len += lenX * lenX * w;

    float ec = lE - lC;
    float ca = lC - lA;
    float lenY = 1.0 / max(max(abs(ec), abs(ca)), 1e-5);
    float dirY = lE - lA;
    dir.y += dirY * w;
    lenY = clamp(abs(dirY) * lenY, 0.0, 1.0);
    len += lenY * lenY * w;
  }

  void easuTap(
    inout vec3 aC,
    inout float aW,
    vec2 off,
    vec2 dir,
    vec2 len2,
    float lob,
    float clp,
    vec3 c
  ) {
    vec2 v = vec2(
      off.x * dir.x + off.y * dir.y,
      off.x * -dir.y + off.y * dir.x
    );
    v *= len2;

    float d2 = min(v.x * v.x + v.y * v.y, clp);
    float wB = 2.0 / 5.0 * d2 - 1.0;
    float wA = lob * d2 - 1.0;
    wB *= wB;
    wA *= wA;
    wB = 25.0 / 16.0 * wB - (25.0 / 16.0 - 1.0);

    float w = wB * wA;

    aC += c * w;
    aW += w;
  }

  void main(void) {
    vec2 pp = vUV * inputSize - 0.5;
    vec2 fp = floor(pp);
    pp -= fp;

    // The 12 taps, centres in source pixels:
    //      b c
    //    e f g h
    //    i j k l
    //      n o
    vec2 base = fp + 0.5;
    vec3 cb = tap(base + vec2(0.0, -1.0));
    vec3 cc = tap(base + vec2(1.0, -1.0));
    vec3 ce = tap(base + vec2(-1.0, 0.0));
    vec3 cf = tap(base);
    vec3 cg = tap(base + vec2(1.0, 0.0));
    vec3 ch = tap(base + vec2(2.0, 0.0));
    vec3 ci = tap(base + vec2(-1.0, 1.0));
    vec3 cj = tap(base + vec2(0.0, 1.0));
    vec3 ck = tap(base + vec2(1.0, 1.0));
    vec3 cl = tap(base + vec2(2.0, 1.0));
    vec3 cn = tap(base + vec2(0.0, 2.0));
    vec3 co = tap(base + vec2(1.0, 2.0));

    vec2 dir = vec2(0.0);
    float len = 0.0;

    easuSet(dir, len, (1.0 - pp.x) * (1.0 - pp.y), cb.g, ce.g, cf.g, cg.g, cj.g);
    easuSet(dir, len, pp.x * (1.0 - pp.y), cc.g, cf.g, cg.g, ch.g, ck.g);
    easuSet(dir, len, (1.0 - pp.x) * pp.y, cf.g, ci.g, cj.g, ck.g, cn.g);
    easuSet(dir, len, pp.x * pp.y, cg.g, cj.g, ck.g, cl.g, co.g);

    float dirR = dir.x * dir.x + dir.y * dir.y;

    if (dirR < (1.0 / 32768.0)) {
      dir = vec2(1.0, 0.0);
    } else {
      dir *= inversesqrt(dirR);
    }

    // {0, 2} to {0, 1}, shaped: how much of an edge this is.
    len = len * 0.5;
    len = len * len;

    // The kernel stretches from round to sqrt(2) long on a diagonal, and its
    // window widens with the edge.
    float stretch =
      (dir.x * dir.x + dir.y * dir.y) / max(abs(dir.x), abs(dir.y));
    vec2 len2 = vec2(1.0 + (stretch - 1.0) * len, 1.0 - 0.5 * len);
    float lob = 0.5 + ((1.0 / 4.0 - 0.04) - 0.5) * len;
    float clp = 1.0 / lob;

    vec3 aC = vec3(0.0);
    float aW = 0.0;

    easuTap(aC, aW, vec2(0.0, -1.0) - pp, dir, len2, lob, clp, cb);
    easuTap(aC, aW, vec2(1.0, -1.0) - pp, dir, len2, lob, clp, cc);
    easuTap(aC, aW, vec2(-1.0, 0.0) - pp, dir, len2, lob, clp, ce);
    easuTap(aC, aW, vec2(0.0, 0.0) - pp, dir, len2, lob, clp, cf);
    easuTap(aC, aW, vec2(1.0, 0.0) - pp, dir, len2, lob, clp, cg);
    easuTap(aC, aW, vec2(2.0, 0.0) - pp, dir, len2, lob, clp, ch);
    easuTap(aC, aW, vec2(-1.0, 1.0) - pp, dir, len2, lob, clp, ci);
    easuTap(aC, aW, vec2(0.0, 1.0) - pp, dir, len2, lob, clp, cj);
    easuTap(aC, aW, vec2(1.0, 1.0) - pp, dir, len2, lob, clp, ck);
    easuTap(aC, aW, vec2(2.0, 1.0) - pp, dir, len2, lob, clp, cl);
    easuTap(aC, aW, vec2(0.0, 2.0) - pp, dir, len2, lob, clp, cn);
    easuTap(aC, aW, vec2(1.0, 2.0) - pp, dir, len2, lob, clp, co);

    // Deringed against the four pixels the destination sits between: the
    // kernel has negative lobes and would otherwise overshoot an edge.
    vec3 mn4 = min(min(cf, cg), min(cj, ck));
    vec3 mx4 = max(max(cf, cg), max(cj, ck));

    gl_FragColor = vec4(min(mx4, max(mn4, aC / aW)), 1.0);
  }
  `;

/**
 * RCAS: give the edges back the contrast the resample cost them, under a limit
 * computed from the pixel's own neighbourhood, so flat areas and noise are
 * left where they are.
 */
const RCAS_FRAGMENT = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform vec2 texel;
  uniform float sharpness;

  void main(void) {
    vec3 e = texture2D(textureSampler, vUV).rgb;
    vec3 b = texture2D(textureSampler, vUV + vec2(0.0, -texel.y)).rgb;
    vec3 d = texture2D(textureSampler, vUV + vec2(-texel.x, 0.0)).rgb;
    vec3 f = texture2D(textureSampler, vUV + vec2(texel.x, 0.0)).rgb;
    vec3 h = texture2D(textureSampler, vUV + vec2(0.0, texel.y)).rgb;

    vec3 mn4 = min(min(b, d), min(f, h));
    vec3 mx4 = max(max(b, d), max(f, h));

    // How far the centre may be pushed before the cross would clip.
    vec3 hitMin = mn4 / (4.0 * mx4 + 1e-5);
    vec3 hitMax = (1.0 - mx4) / (4.0 * mn4 - 4.0 - 1e-5);
    vec3 lobeRGB = max(-hitMin, hitMax);

    float lobe =
      max(-0.1875, min(max(lobeRGB.r, max(lobeRGB.g, lobeRGB.b)), 0.0)) *
      sharpness;

    gl_FragColor = vec4((lobe * (b + d + f + h) + e) / (4.0 * lobe + 1.0), 1.0);
  }
  `;

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  scale: number;
  /** The drawing buffer this was built against; a resize rebuilds. */
  width: number;
  height: number;
  /** What the camera renders into: the whole frame, at the reduced size. */
  target: RenderTargetTexture;
  /** First on the camera: its ratio is what the scene is drawn at. */
  entry: PostProcess;
  /** The sharpened frame, still at the reduced size. */
  sharpTarget: RenderTargetTexture;
  /** Which of the two the reconstruction reads this frame. */
  easuFrom: RenderTargetTexture;
  renderer: EffectRenderer;
  easu: EffectWrapper;
  rcas: EffectWrapper;
  after: Observer<Scene>;
};

let runtime: Runtime | null = null;

function build(
  scene: Scene,
  camera: ArcRotateCamera,
  scale: number
): Runtime | null {
  const engine = scene.getEngine();
  const width = engine.getRenderWidth(true);
  const height = engine.getRenderHeight(true);

  if (width < 8 || height < 8) return null;

  const small = {
    width: Math.max(1, (width * scale) | 0),
    height: Math.max(1, (height * scale) | 0),
  };

  registerEntryShader();

  // The camera's whole output, post chain included. No depth and no samples:
  // the entry pass is always in front of it, so the scene is never drawn into
  // this one - the chain's last pass writes it, already resolved.
  const target = new RenderTargetTexture('upscaleFrame', small, scene, {
    generateDepthBuffer: false,
    generateMipMaps: false,
    type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
    samplingMode: Texture.BILINEAR_SAMPLINGMODE,
  });

  target.wrapU = Texture.CLAMP_ADDRESSMODE;
  target.wrapV = Texture.CLAMP_ADDRESSMODE;

  const entry = new PostProcess(
    ENTRY_SHADER,
    ENTRY_SHADER,
    [],
    [],
    scale,
    null,
    Texture.BILINEAR_SAMPLINGMODE,
    engine,
    false,
    null,
    Constants.TEXTURETYPE_HALF_FLOAT
  );

  // The scene is drawn into this one, so it is the pass that has to carry the
  // multisampling - the same reason `fireflyGuard` does when it is first.
  entry.samples = pipelineSamples();

  // The sharpened frame, still small. RCAS runs before the reconstruction
  // rather than after it, which is not where FidelityFX puts it: after it, it
  // is a second pass over every pixel of the window, and on the machine this
  // feature is for that costs more than the reconstruction itself (2.5 ms
  // against 1.0 on a Radeon 610M). Here it reads and writes a third of the
  // pixels, and EASU carries the contrast up with the edges.
  const sharpTarget = new RenderTargetTexture('upscaleSharp', small, scene, {
    generateDepthBuffer: false,
    generateMipMaps: false,
    type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
    samplingMode: Texture.BILINEAR_SAMPLINGMODE,
  });

  sharpTarget.wrapU = Texture.CLAMP_ADDRESSMODE;
  sharpTarget.wrapV = Texture.CLAMP_ADDRESSMODE;

  const easu = new EffectWrapper({
    engine,
    name: EASU_SHADER,
    fragmentShader: EASU_FRAGMENT,
    uniformNames: ['inputSize', 'rcpInput'],
    samplerNames: ['textureSampler'],
  });

  easu.onApplyObservable.add(() => {
    const effect = easu.effect;

    effect.setTexture('textureSampler', rt?.easuFrom ?? sharpTarget);
    effect.setFloat2('inputSize', small.width, small.height);
    effect.setFloat2('rcpInput', 1 / small.width, 1 / small.height);
  });

  const rcas = new EffectWrapper({
    engine,
    name: RCAS_SHADER,
    fragmentShader: RCAS_FRAGMENT,
    uniformNames: ['texel', 'sharpness'],
    samplerNames: ['textureSampler'],
  });

  rcas.onApplyObservable.add(() => {
    const effect = rcas.effect;

    effect.setTexture('textureSampler', target);
    effect.setFloat2('texel', 1 / small.width, 1 / small.height);
    effect.setFloat('sharpness', rcasSharpness(scale));
  });

  camera.attachPostProcess(entry, 0);
  camera.outputRenderTarget = target;

  const renderer = new EffectRenderer(engine);

  const rt: Runtime = {
    scene,
    camera,
    scale,
    width,
    height,
    target,
    entry,
    sharpTarget,
    easuFrom: sharpTarget,
    renderer,
    easu,
    rcas,
    after: null as unknown as Observer<Scene>,
  };

  rt.after = scene.onAfterRenderObservable.add(() => present(rt));

  return rt;
}

/**
 * The frame the camera drew, onto the screen. Nothing else reaches the
 * drawing buffer while this is live, so a frame that cannot be presented -
 * either shader still compiling - leaves the previous one standing rather
 * than a black screen.
 */
function present(rt: Runtime): void {
  if (rt.scene.activeCamera !== rt.camera) return;
  if (!rt.easu.effect.isReady() || !rt.rcas.effect.isReady()) return;

  const engine = rt.scene.getEngine();

  // Sharpen small, then reconstruct onto the screen. `?rcas=-1` skips the
  // sharpen and reconstructs the frame as the chain left it.
  if (rcasDev !== null && rcasDev < 0) {
    rt.easuFrom = rt.target;
  } else {
    rt.easuFrom = rt.sharpTarget;
    rt.renderer.render(rt.rcas, rt.sharpTarget);
  }

  engine.restoreDefaultFramebuffer();
  engine.setViewport(rt.camera.viewport);
  rt.renderer.render(rt.easu);
}

export function disposeUpscale(): void {
  if (!runtime) return;

  const { scene, camera, entry, target, sharpTarget, renderer, easu, rcas } =
    runtime;

  scene.onAfterRenderObservable.remove(runtime.after);

  if (camera.outputRenderTarget === target) camera.outputRenderTarget = null;

  camera.detachPostProcess(entry);
  entry.dispose(camera);
  target.dispose();
  sharpTarget.dispose();
  easu.dispose();
  rcas.dispose();
  renderer.dispose();

  runtime = null;
}

/**
 * Build or tear down, once a tick from the director. Not a pass the chain
 * order depends on: the entry sits at the head of the camera's list where
 * nothing else inserts, and the two that present are not on the camera at all.
 */
export function syncUpscale(scene: Scene, camera: ArcRotateCamera): void {
  const live = upscaleLive();
  const scale = upscaleScale();
  const engine = scene.getEngine();
  const width = engine.getRenderWidth(true);
  const height = engine.getRenderHeight(true);

  if (
    runtime &&
    (!live ||
      runtime.scene !== scene ||
      runtime.camera !== camera ||
      runtime.scale !== scale ||
      runtime.width !== width ||
      runtime.height !== height)
  ) {
    disposeUpscale();
  }

  if (!live) return;

  if (runtime) {
    const samples = pipelineSamples();

    if (runtime.entry.samples !== samples) runtime.entry.samples = samples;

    return;
  }

  runtime = build(scene, camera, scale);
}

/** Whether the upscale is drawing right now; the perf overlay prints it. */
export function upscaleActive(): boolean {
  return runtime !== null;
}
