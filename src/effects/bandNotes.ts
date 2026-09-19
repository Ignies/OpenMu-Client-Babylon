/**
 * Band notes - a music note that flows out of an instrument for every note
 * it plays: the strum the held pose does not make.
 *
 * Unlike the rest of the effects a note is not a glow: it is a solid glyph,
 * alpha-tested in the world's own rendering group, so it writes depth and
 * lands in the G-buffer - which is what gives it an ink line of its own
 * under the Anime style (scenes/inkOutline.ts) instead of the contour that
 * pass draws around the additive cards. Tinted by the pitch class, twelve
 * hues around the octave, and sized by the velocity. The glyph is drawn
 * once per scene into a small dynamic texture as shapes (head, stem, flag,
 * beam), not a font character: every machine draws the same note.
 *
 * A note leaves the instrument forward, the way the performer faces, in a
 * loose fan - one a little to the left, the next a little to the right -
 * and lifts as it goes, on a curve that steepens toward the end. It starts
 * small and grows as it travels, holds its colour through the first half of
 * the way and then fades out smoothly, and drags a soft wake of its own
 * colour along the curve behind it - so the notes are seen to flow out of
 * the music, not to float off it.
 *
 * Driven by: `BandSystem`, one spawn per hit it lets through. Read by: nobody.
 */
import {
  Constants,
  DynamicTexture,
  Material,
  StandardMaterial,
  Texture,
  Vector3,
  type Scene,
} from '../libs/babylon/exports';
import {
  LiveList,
  acquireCard,
  additiveMaterial,
  hash,
  lerp,
  releaseCard,
  setCardCell,
  type Card,
  type RGB,
} from './core';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds a note flows before it is gone. */
const SECONDS = 1.8;

/** Card edge in tiles at full velocity: 7.5 cm, a glyph the size of a coin. */
const SIZE = 0.075;

/** The quietest note's share of that. */
const MIN_SIZE = 0.6;

/** How much a note's size wanders from the velocity's, either way: no two alike. */
const SIZE_VARY = 0.3;

/** The note's size along its way, as shares of its own: it grows as it leaves. */
const START_SCALE = 0.6;
const END_SCALE = 2.4;

/** Tiles the curve reaches forward over a life, fast at first and easing off. */
const REACH = 1.3;

/** Tiles it lifts by the end, steepening as it goes: the escalation. */
const RISE = 0.55;

/** The fan, radians off straight ahead: the least a note turns, and how much more it may. */
const FAN = 0.12;
const FAN_VARY = 0.4;

/** A sideways ripple along the way: amplitude in tiles, radians per second. */
const RIPPLE = 0.035;
const RIPPLE_RATE = 4;

/** Tiles a note starts off ahead, so two close in time never share a start. */
const SPREAD = 0.05;

/** Radians the glyph leans into where the curve is heading, as seen on screen. */
const LEAN = 0.4;

/** The fade: whole until this share of the life, then eased smoothly to nothing at the end. */
const FADE_FROM = 0.45;

/** The wake: glow dots along the last stretch of curve, this many seconds apart, this many of them. */
const WAKE_STEP = 0.05;
const WAKE = 12;

/** The wake's width at the note, as a share of the note's size, and the soft glow it is drawn with. */
const WAKE_WIDTH = 3;
const WAKE_TEXTURE = 'Effect/flare01.OZJ';

/** How much of the note's colour the wake carries: a glow, not a second note. */
const WAKE_GAIN = 0.9;

/** Share of the life spent growing in from nothing. */
const GROW = 0.1;

/** Saturation of the pitch hues, 0..1: pastel, so the note reads as a glyph, not a flare. */
const SATURATION = 0.55;

/** Share of notes drawn as the single glyph; the rest are the beamed pair. */
const SINGLE_SHARE = 0.75;

/** The glyph sheet: two 64-texel cells, a single note and a beamed pair. */
const CELL = 64;
const CELLS = { w: CELL, h: CELL, count: 2 };

// ---- 2. state + readers ----------------------------------------------------

export interface BandNoteOptions {
  /** MIDI pitch, 0..127; only its class (the note within the octave) shows. */
  pitch: number;
  /** MIDI velocity, 0..127; the size. */
  velocity?: number;
  /** The performer's facing (radians, MU convention): the way the note flows. */
  yaw?: number;
}

const live = new LiveList();

/** The glyph sheet of the current scene; a map change disposes it with the pools. */
let sheetScene: Scene | null = null;
let sheet: DynamicTexture | null = null;

/** One opaque material per tint, this entry's own: the shared cache holds additive ones. */
const materials = new Map<string, StandardMaterial>();

let seed = 0;

/** Scratch: the camera's right and up, two points of the curve, the span between them. */
const camRight = new Vector3();
const camUp = new Vector3();
const p0 = new Vector3();
const p1 = new Vector3();
const span = new Vector3();

/** How many notes are flowing (debug). */
export function bandNoteCount(): number {
  return live.size;
}

/** Twelve hues around the octave, C red: the same pitch class is always the same colour. */
export function pitchColour(pitch: number): RGB {
  const h = ((((pitch % 12) + 12) % 12) / 12) * 6;
  const i = Math.floor(h);
  const f = h - i;
  const p = 1 - SATURATION;
  const q = 1 - SATURATION * f;
  const t = 1 - SATURATION * (1 - f);
  switch (i % 6) {
    case 0:
      return [1, t, p];
    case 1:
      return [q, 1, p];
    case 2:
      return [p, 1, t];
    case 3:
      return [p, q, 1];
    case 4:
      return [t, p, 1];
    default:
      return [1, p, q];
  }
}

/** A note head: an ellipse tilted up to the right, filled. */
function head(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, 10.5, 7, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The glyphs, white on nothing: the card is alpha-tested, so the sheet's
 * transparent half is the shape the ink pass outlines and the depth buffer
 * sees. White, because the material multiplies the texel by the tint.
 */
function drawSheet(tex: DynamicTexture): void {
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, CELL * 2, CELL);
  ctx.fillStyle = '#fff';

  // Cell 0: one eighth note - head, stem up its right side, a flag curling out.
  head(ctx, 24, 47);
  ctx.fillRect(32, 12, 4, 36);
  ctx.beginPath();
  ctx.moveTo(36, 12);
  ctx.quadraticCurveTo(56, 22, 47, 42);
  ctx.quadraticCurveTo(51, 27, 36, 23);
  ctx.closePath();
  ctx.fill();

  // Cell 1: two eighth notes under one beam, the right one a little higher.
  const x0 = CELL;
  head(ctx, x0 + 16, 50);
  head(ctx, x0 + 44, 45);
  ctx.fillRect(x0 + 24, 14, 4, 37);
  ctx.fillRect(x0 + 52, 9, 4, 37);
  ctx.beginPath();
  ctx.moveTo(x0 + 24, 14);
  ctx.lineTo(x0 + 56, 9);
  ctx.lineTo(x0 + 56, 17);
  ctx.lineTo(x0 + 24, 22);
  ctx.closePath();
  ctx.fill();

  tex.update();
}

function sheetFor(scene: Scene): DynamicTexture {
  if (sheet && sheetScene === scene) return sheet;
  sheet?.dispose();
  // No mipmaps: a mip of a glyph on a clear sheet averages its alpha down
  // toward nothing, and an alpha-tested note would thin and fade with
  // distance instead of staying a solid symbol.
  sheet = new DynamicTexture('fx:bandNotes', { width: CELL * 2, height: CELL }, scene, false, Texture.BILINEAR_SAMPLINGMODE);
  sheet.hasAlpha = true;
  sheet.wrapU = Texture.CLAMP_ADDRESSMODE;
  sheet.wrapV = Texture.CLAMP_ADDRESSMODE;
  sheetScene = scene;
  drawSheet(sheet);
  return sheet;
}

/**
 * The glyph in one tint: unlit, so the texel is simply multiplied by it
 * (`emissiveColor` with lighting off), alpha-tested so it is cut to its own
 * outline and blended on top of that so the card's `visibility` fades it: a
 * faint note is still a note-shaped one. (Test alone ignores the visibility:
 * a material with a transparency mode decides blending by that mode only.)
 */
function noteMaterial(scene: Scene, colour: RGB): StandardMaterial {
  const key = `${(colour[0] * 255) | 0},${(colour[1] * 255) | 0},${(colour[2] * 255) | 0}`;
  const known = materials.get(key);
  if (known && known.getScene() === scene) return known;
  const mat = new StandardMaterial(`fx:note:${key}`, scene);
  mat.diffuseColor.set(0, 0, 0);
  mat.specularColor.set(0, 0, 0);
  mat.ambientColor.set(0, 0, 0);
  mat.emissiveColor.set(colour[0], colour[1], colour[2]);
  mat.disableLighting = true;
  mat.diffuseTexture = sheetFor(scene);
  // The alpha test reads the *material's* alpha, which only picks up the
  // texture's with this on (Babylon's ALPHATEST_AFTERALLALPHACOMPUTATIONS):
  // without it the sheet's clear half draws as a black square around the note.
  mat.useAlphaFromDiffuseTexture = true;
  mat.alphaMode = Constants.ALPHA_COMBINE;
  mat.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
  mat.backFaceCulling = false;
  materials.set(key, mat);
  return mat;
}

/** The camera's right and up: the plane a lean is measured in. */
function readCamera(scene: Scene): void {
  const cam = scene.activeCamera;
  if (!cam) {
    camRight.set(1, 0, 0);
    camUp.set(0, 1, 0);
    return;
  }
  cam.getDirectionToRef(Vector3.RightReadOnly, camRight);
  cam.getDirectionToRef(Vector3.UpReadOnly, camUp);
}

/** A direction's roll in the camera's plane: a billboard's rotation.z turns clockwise for positive values. */
function screenRoll(dir: Vector3): number {
  return -Math.atan2(Vector3.Dot(dir, camUp), Vector3.Dot(dir, camRight));
}

/** How far along its way a note is at share `p` of its life: fast off the instrument, easing off. */
function travelled(p: number): number {
  const left = 1 - Math.min(1, p);
  return 1 - left * left;
}

function spawn(scene: Scene, at: Vector3, opts: BandNoteOptions): EffectHandle {
  const colour = pitchColour(opts.pitch);
  const material = noteMaterial(scene, colour);
  // Group 0: a note is a solid thing in the world, not a glow over it.
  const card: Card = acquireCard(scene, material, true, 0);
  const s = seed++;
  setCardCell(card, CELLS, hash(s) < SINGLE_SHARE ? 0 : 1);
  const glow = additiveMaterial(scene, WAKE_TEXTURE, [colour[0] * WAKE_GAIN, colour[1] * WAKE_GAIN, colour[2] * WAKE_GAIN]);
  const wake: Card[] = [];
  for (let k = 0; k < WAKE; k++) {
    const dot = acquireCard(scene, glow);
    dot.scaling.setAll(0);
    wake.push(dot);
  }
  const velocity = Math.max(0, Math.min(127, opts.velocity ?? 100)) / 127;
  const size = SIZE * lerp(MIN_SIZE, 1, velocity) * (1 + SIZE_VARY * (hash(s + 0.5) * 2 - 1));
  const side = s % 2 === 0 ? -1 : 1;
  const heading = (opts.yaw ?? 0) + side * (FAN + FAN_VARY * hash(s + 0.25));
  // MU's yaw: forward is (sin, -cos) on the ground; its right-hand side turns from that.
  const fx = Math.sin(heading), fz = -Math.cos(heading);
  const rx = -fz, rz = fx;
  const x = at.x, y = at.y, z = at.z;
  card.position.set(x, y, z);
  card.scaling.setAll(0);

  /** The curve `age` seconds in: forward and lifting, with a ripple across it. */
  const arcAt = (age: number, out: Vector3): void => {
    const p = Math.min(1, age / SECONDS);
    const d = SPREAD + REACH * travelled(p);
    const lift = RISE * p * p;
    const ripple = RIPPLE * Math.sin(RIPPLE_RATE * age);
    out.set(x + fx * d + rx * ripple, y + lift, z + fz * d + rz * ripple);
  };
  /** The note's size and opacity `age` seconds in. */
  const sizeAt = (age: number): number => {
    const p = Math.min(1, age / SECONDS);
    const grownIn = p < GROW ? p / GROW : 1;
    return size * lerp(START_SCALE, END_SCALE, travelled(p)) * grownIn;
  };
  const fadeAt = (age: number): number => {
    const q = Math.min(1, Math.max(0, (age / SECONDS - FADE_FROM) / (1 - FADE_FROM)));
    return 1 - q * q * (3 - 2 * q);
  };

  let t = 0;
  return live.push({
    update(dt) {
      t += dt;
      if (t >= SECONDS) return false;
      readCamera(scene);

      // The note, leaning into where the curve is heading.
      arcAt(t, p1);
      arcAt(Math.max(0, t - WAKE_STEP), p0);
      p1.subtractToRef(p0, span);
      const slope = span.lengthSquared() > 0 ? screenRoll(span) + Math.PI / 2 : 0;
      card.scaling.setAll(sizeAt(t));
      card.rotation.z = slope * LEAN;
      card.position.copyFrom(p1);
      card.visibility = fadeAt(t);

      // The wake: a dot per step of curve behind it, thinning to the tail.
      for (let k = 0; k < WAKE; k++) {
        const dot = wake[k];
        const age = t - (k + 1) * WAKE_STEP;
        if (age <= 0) {
          dot.scaling.setAll(0);
          continue;
        }
        arcAt(age, p0);
        dot.position.copyFrom(p0);
        dot.scaling.setAll(sizeAt(age) * WAKE_WIDTH * (1 - (k + 1) / (WAKE + 1)));
        dot.visibility = fadeAt(age);
      }
      return true;
    },
    release() {
      releaseCard(scene, card);
      for (const dot of wake) releaseCard(scene, dot);
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
  for (const mat of materials.values()) mat.dispose();
  materials.clear();
  sheet?.dispose();
  sheet = null;
  sheetScene = null;
}

// ---- 3. the layer ----------------------------------------------------------

export const bandNotesLayer: EffectLayer<BandNoteOptions, 'bandNotes'> = {
  name: 'bandNotes',
  update,
  reset,
  spawn,
};
