import {
  Constants,
  EffectRenderer,
  EffectWrapper,
  GeometryBufferRenderer,
  RenderTargetTexture,
  Texture,
  type Scene,
} from '../libs/babylon/exports';
import { devQuery } from '../common/devSeams';
import { GameOptions } from '../common/gameOptions';

/**
 * Frame generation (documentation/frame_generation/ARCHITECTURE.md): render the
 * world every other tick and fill the gap with the last real frame pushed
 * forward along its own motion vectors.
 *
 * Forward, not between: interpolation would have to hold a rendered frame back,
 * and a browser has one canvas and one frame per rAF to hide that latency in.
 * The price is that a generated frame can only move what the last one already
 * contained - whatever the motion uncovers has no source pixel and takes its
 * neighbour's colour.
 *
 * Sole owner of the captured colour texture, the alternation, and the warp
 * pass. Reads the velocity target off the G-buffer and never writes to it.
 * Every reason a generated frame cannot be built falls back to rendering a real
 * one, so the worst failure is the frame rate we already have.
 *
 * On when the option is on, on every machine. Whether it *helps* depends on
 * what is holding the frame up, which this measures and reports but does not
 * act on (`frameGenGenerating`, and performance.md for the three machines).
 *
 * It needs the G-buffer's velocity target, which the ambient occlusion builds,
 * so it runs on the shaped tiers with post processing on and nowhere else. The
 * option row is dimmed on Classic for that reason.
 *
 * Seam: `?framegen=0|1|nohold` overrides the option.
 */

const SHADER = 'frameGenWarp';

/**
 * How far along the velocity a generated frame sits. The field spans one
 * render interval, which is two ticks once the alternation is on, and the
 * generated frame sits halfway through it.
 */
const WARP = 0.5;

/**
 * `?framegen=` overrides the option for an A/B: `0` off, `1` on, `nohold`
 * keeps the simulation running on a generated tick.
 */
type Seam = {
  readonly set: boolean;
  readonly on: boolean;
  readonly hold: boolean;
};

let seam: Seam | null = null;

function read(): Seam {
  const raw = devQuery('framegen');

  if (!raw) return { set: false, on: false, hold: true };

  return {
    set: true,
    on: raw !== '0' && raw !== 'off',
    hold: !raw.split(',').includes('nohold'),
  };
}

function seamRead(): Seam {
  return (seam ??= read());
}

/** The option, or the seam when one is set. */
export function frameGenRequested(): boolean {
  const s = seamRead();

  return s.set ? s.on : GameOptions.frameGeneration;
}

/**
 * Whether a generated tick also skips the simulation, which is the whole of
 * the win: measured, a pair that still simulates twice draws the world a
 * third *less* often than not generating at all, while a pair that holds
 * doubles the presented frames and leaves the draw rate where it was
 * (performance.md). It also samples input and steps animation at half rate,
 * which is the price.
 */
export function frameGenHoldsLogic(): boolean {
  return frameGenRequested() && seamRead().hold;
}

/**
 * The verdict this keeps on whether the machine it is running on gains from
 * generating frames. Reported - by the dev global and the perf overlay - and
 * never acted on; `frameGenGenerating` says why.
 *
 * How far over a display frame the interval has to sit, and how long it has to
 * stay there. The margins are wide and both sit *above* the target, because
 * generating is not free and its cost lands in the same number: the velocity
 * target and the frame copy put about 5 ms on a real tick, so a machine that
 * measures 15 ms with the feature off measures 20 with it on, and narrow
 * margins would read that back as proof of its own necessity.
 *
 * A tick over 100 ms is a map load or a stall, not the frame rate, and is left
 * out rather than allowed to hold the verdict for the next thirty frames.
 */
const COST_WINDOW = 30;
const BEHIND = 1.3;
const CAUGHT_UP = 1.2;
const OUTLIER_MS = 100;

/**
 * How much of a real frame the main thread has to be, for a generated one to
 * be worth drawing.
 *
 * This is the condition that separates the machines the feature helps from
 * the ones it hurts, and it took two machines to find it. A generated frame is cheap on the CPU and
 * not free on the GPU: it is a full-screen pass, and it needs the velocity
 * target, which is another attachment on the G-buffer and a matrix clone per
 * mesh per frame.
 *
 * So where the main thread is the frame - the CPU busy, the card waiting -
 * that pass runs in time the GPU was going to spend idle, and the presented
 * rate doubles with the draw rate untouched. Where the *card* is the frame,
 * it takes its slice out of the only thing that was holding the frame up:
 * measured on a Radeon 610M in Lorencia, the world went from being drawn 17.7
 * times a second to 11.5 while the presented count rose to 23. More frames on
 * screen, a third fewer of them real, and every one of them a third older.
 * That is not a trade worth making for a player, and no amount of tuning the
 * warp changes it.
 *
 * The main thread's share of the frame interval is what tells the two apart,
 * and it costs nothing to measure.
 */
const CPU_SHARE = 0.8;

let costMs = 0;
let intervalMs = 0;
let costFilled = 0;
let lastRealAt = 0;

/**
 * The frame a real tick has to beat, fixed at 60 Hz rather than measured.
 *
 * Measuring it was the first attempt and it does not survive contact: the
 * browser hands back two animation frames inside one refresh often enough
 * that the shortest present is 2 ms, and a gate built on that is permanently
 * open. The interval cannot be read from the long presents either - when the
 * machine is behind, those are the machine, not the display.
 *
 * So: a generated frame is worth having when a real one does not fit in a
 * 60 Hz frame. A player on 144 Hz who is making 100 gets nothing out of this,
 * which is the conservative direction to be wrong in.
 */
const TARGET_MS = 1000 / 60;
let favourable = false;
/** What the render loop decided on its last tick, for the dev global. */
let lastDecision = false;

/**
 * What the last real tick cost on the main thread: update plus render, which
 * is what has to fit inside a display frame. Called by the render loop, on
 * real ticks only - a generated tick costs a fullscreen pass and measuring it
 * would drag the average under the line the average exists to test.
 */
export function frameGenNoteFrame(realCostMs: number): void {
  const now = performance.now();
  const gap = lastRealAt > 0 ? now - lastRealAt : 0;

  lastRealAt = now;

  if (realCostMs <= 0 || realCostMs > OUTLIER_MS) return;
  if (gap <= 0 || gap > OUTLIER_MS * 4) return;

  costFilled = Math.min(COST_WINDOW, costFilled + 1);
  costMs += (realCostMs - costMs) / costFilled;
  intervalMs += (gap - intervalMs) / costFilled;

  if (costFilled < COST_WINDOW) return;

  // Two conditions, and both have to hold for this machine to be one that
  // gains: the frame has to be one the display would have shown twice, and
  // the main thread has to be what is holding it up - see CPU_SHARE.
  // Hysteresis on the first, because one slow frame is not a slow machine and
  // one fast one is not a machine that has caught up.
  //
  // Reported, not obeyed. It used to decide, and the reasons it no longer
  // does are above `frameGenGenerating`.
  const slow = favourable
    ? intervalMs > TARGET_MS * CAUGHT_UP
    : intervalMs > TARGET_MS * BEHIND;

  favourable = slow && costMs >= intervalMs * CPU_SHARE;
}

/** Whether the alternation would run right now, and why, for the overlay. */
export function frameGenState(): {
  on: boolean;
  generating: boolean;
  /** Whether this machine measures as one that gains from it. */
  favourable: boolean;
  costMs: number;
  intervalMs: number;
  targetMs: number;
} {
  return {
    on: frameGenRequested(),
    generating: frameGenGenerating(),
    favourable,
    costMs,
    intervalMs,
    targetMs: TARGET_MS,
  };
}

/**
 * Whether to alternate right now. The option is the answer: ticking the box
 * turns frame generation on, on every machine, because the point of shipping
 * it behind a box is that people can try it and say what it does for them.
 *
 * It was gated at first - on the frame not fitting in a display frame *and*
 * the main thread being what held it up - and the gate was right about the
 * facts (see `frameGenBoundState`, and performance.md for the three machines
 * it was measured on). It was wrong as a product: a box that quietly decides
 * against you cannot be tested, and the one machine where it refused is the
 * one whose owner most wants to see for themselves.
 *
 * The measurement stays live and the dev global reports it, so a tester can
 * tell whether their machine is the case this helps or the case it does not.
 */
function frameGenGenerating(): boolean {
  return frameGenRequested();
}

/**
 * Whether the G-buffer should carry velocity. Asked by `motionVectors.ts`,
 * which owns the target; this only says whether anything wants it.
 *
 * The option, not the frame rate: the setter disposes the whole G-buffer and
 * builds a new one, so this is not a thing to switch on and off underneath a
 * player who is standing in a fight. It goes on when the box is ticked and off
 * when it is unticked, and nowhere else.
 */
export function frameGenWantsVelocity(): boolean {
  return frameGenRequested();
}

type Runtime = {
  readonly scene: Scene;
  readonly capture: RenderTargetTexture;
  readonly renderer: EffectRenderer;
  readonly wrapper: EffectWrapper;
  readonly width: number;
  readonly height: number;
};

let runtime: Runtime | null = null;
/** False until a real frame has been captured that a warp could be built from. */
let captured = false;
/** Whether the tick just gone drew the world. */
let drewLast = false;
/** The velocity target the pass about to run should read. */
let bound: Texture | null = null;
/** How far along the velocity the pass about to run should push. */
let amount = 0;

/** Dev counters: which of these actually run, and how often. */
const counters = {
  present: 0,
  capture: 0,
  apply: 0,
  noCamera: 0,
  noVelocity: 0,
};

// Source, not a store name: EffectWrapper takes the code directly unless it
// is told to use the shader store, and hands the name itself to the compiler
// if you get that wrong.
const FRAGMENT = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D frameSampler;
  uniform sampler2D velocitySampler;
  uniform float warp;

  void main(void) {
    vec4 packed = texture2D(velocitySampler, vUV);
    vec2 uv = vUV;

    // Alpha 0 is a pixel no mesh wrote - sky, and everything blended. It has
    // no velocity to follow, so it stands still for this frame.
    if (packed.a >= 0.5) {
      // The cube-root packing undone; the odd power carries the sign.
      vec2 d = packed.rg * 2.0 - 1.0;
      vec2 v = d * d * d;

      // Where the content that belongs at this pixel was in the captured
      // frame. Sampling the velocity at the destination is the cheap
      // approximation: right wherever the field is smooth, wrong at
      // silhouettes, which is where the smearing comes from.
      uv = clamp(vUV - v * warp, vec2(0.0), vec2(1.0));
    }

    gl_FragColor = texture2D(frameSampler, uv);
  }
  `;

function velocityTexture(scene: Scene): Texture | null {
  const gbuffer = scene.geometryBufferRenderer;
  if (!gbuffer || !gbuffer.enableVelocity) return null;

  const index = gbuffer.getTextureIndex(
    GeometryBufferRenderer.VELOCITY_TEXTURE_TYPE
  );

  return index < 0 ? null : gbuffer.getGBuffer().textures[index] ?? null;
}

function build(scene: Scene): Runtime | null {
  const engine = scene.getEngine();
  const width = engine.getRenderWidth();
  const height = engine.getRenderHeight();

  if (width < 2 || height < 2) return null;

  // The frame itself, not a copy of it: the camera is pointed at this below.
  const capture = new RenderTargetTexture(
    'frameGenCapture',
    { width, height },
    scene,
    {
      // The whole scene renders in here, not just a copy of a finished frame,
      // so it needs somewhere to depth test against.
      generateDepthBuffer: true,
      generateStencilBuffer: true,
      generateMipMaps: false,
      type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
      samplingMode: Texture.BILINEAR_SAMPLINGMODE,
    }
  );

  // The camera draws into this instead of the canvas, post chain and all, so
  // the finished frame is already a texture we can sample. Nothing reaches the
  // screen until `present` puts it there.
  const camera = scene.activeCamera;
  if (!camera) return null;
  camera.outputRenderTarget = capture;

  const wrapper = new EffectWrapper({
    engine,
    name: SHADER,
    fragmentShader: FRAGMENT,
    uniformNames: ['warp'],
    samplerNames: ['frameSampler', 'velocitySampler'],
  });

  // Registered once. A closure per presented frame would be an allocation per
  // frame on the thread this feature is meant to relieve.
  wrapper.onApplyObservable.add(() => {
    counters.apply++;
    if (!bound) return;

    const effect = wrapper.effect;

    effect.setTexture('frameSampler', capture);
    effect.setTexture('velocitySampler', bound);
    effect.setFloat('warp', amount);
  });

  return {
    scene,
    capture,
    renderer: new EffectRenderer(engine),
    wrapper,
    width,
    height,
  };
}

export function disposeFrameGen(): void {
  if (!runtime) return;

  // Before the texture goes: leaving the camera pointed at a disposed target
  // is a black screen with no error.
  const camera = runtime.scene.activeCamera;
  if (camera && camera.outputRenderTarget === runtime.capture) {
    camera.outputRenderTarget = null;
  }

  runtime.wrapper.dispose();
  runtime.renderer.dispose();
  runtime.capture.dispose();
  runtime = null;
  captured = false;
  drewLast = false;
  bound = null;
}

/**
 * Called once a tick, before the render. Answers true for a real frame and
 * false for a generated one, and is the only place the alternation advances.
 */
export function frameGenShouldRender(scene: Scene): boolean {
  if (!frameGenRequested()) return true;

  lastDecision = frameGenGenerating();

  // Dormant, and dormant means *gone*: the camera draws into a target while
  // this is built, so every frame pays a full-screen blit to get onto the
  // canvas whether or not one was generated. A machine the gate has decided
  // against should be paying nothing at all.
  if (!lastDecision) {
    if (runtime) disposeFrameGen();

    return true;
  }

  const engine = scene.getEngine();
  const width = engine.getRenderWidth();
  const height = engine.getRenderHeight();

  if (runtime && (runtime.scene !== scene || runtime.width !== width || runtime.height !== height)) {
    disposeFrameGen();
  }

  if (!runtime) {
    runtime = build(scene);
    if (!runtime) return true;
  }

  // Nothing to warp yet, or nothing to warp it with.
  if (
    !captured ||
    !velocityTexture(scene) ||
    !runtime.wrapper.effect?.isReady()
  ) {
    drewLast = true;
    return true;
  }

  drewLast = !drewLast;

  return drewLast;
}

/**
 * The frame the camera just drew is already in our texture - the camera
 * renders into it rather than to the canvas - so all this does is put it on
 * screen unwarped, and note that there is now something to warp next tick.
 *
 * Reading the back buffer with `copyTexSubImage2D` was the first attempt and
 * silently copied nothing, which presents as every other frame being black.
 */
export function frameGenCapture(scene: Scene): void {
  if (!runtime || !frameGenRequested()) return;

  counters.capture++;
  present(scene, 0);
  captured = true;
}

/**
 * Puts the captured frame on the canvas, pushed `warp` of a render interval
 * along its own motion. Both tick types come through here - a real frame at 0,
 * a generated one at `WARP` - so the screen is only ever drawn one way and a
 * fault shows up on every frame rather than every other one.
 */
function present(scene: Scene, warp: number): void {
  if (!runtime) return;

  const camera = scene.activeCamera;
  const velocity = velocityTexture(scene);

  if (!camera) {
    counters.noCamera++;
    return;
  }

  // A real frame is the capture drawn at warp 0, and at 0 the velocity is
  // multiplied away before it is read - so it does not have to be there. It
  // has to be *bound*, or the sampler reads whatever was last in the unit,
  // and the capture itself is the cheapest thing to hand it.
  if (!velocity) {
    counters.noVelocity++;
    if (warp !== 0) return;
  }

  counters.present++;
  bound = velocity ?? runtime.capture;
  amount = velocity ? warp : 0;

  const engine = scene.getEngine();

  engine.restoreDefaultFramebuffer();
  engine.setViewport(camera.viewport);
  runtime.renderer.render(runtime.wrapper);
}

/** Draws the generated frame: the captured one, warped forward. */
export function frameGenPresent(scene: Scene): void {
  present(scene, WARP);
}

export function frameGenLive(): boolean {
  return runtime !== null && captured;
}

// The window guard is not decoration: the ambient occlusion reaches this
// module now, so it is in the import graph of tests that run under node.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __framegen: unknown }).__framegen = {
    counters: () => ({ ...counters }),
    state: () => ({
      runtime: !!runtime,
      captured,
      drewLast,
      bound: !!bound,
      ready: runtime?.wrapper.effect?.isReady() ?? null,
      size: runtime ? [runtime.width, runtime.height] : null,
      ...frameGenState(),
      lastDecision,
    }),
    /** Does the captured texture hold a picture, or nothing? */
    readCapture: async () => {
      if (!runtime) return null;
      const data = (await runtime.capture.readPixels()) as Uint8Array | null;
      if (!data) return { read: false };
      let sum = 0;
      let nonZero = 0;
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i] + data[i + 1] + data[i + 2];
        sum += v;
        if (v > 0) nonZero++;
      }
      return {
        read: true,
        texels: data.length / 4,
        nonZero,
        mean: +(sum / (data.length / 4) / 3).toFixed(2),
      };
    },
  };
}
