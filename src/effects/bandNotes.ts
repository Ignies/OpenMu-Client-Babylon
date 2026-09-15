/**
 * Band notes - a music note that floats up from an instrument for every note
 * it plays: the strum the held pose does not make. One additive card per
 * note, so the Anime style contours it with the other effects
 * (scenes/inkOutline.ts); tinted by the pitch class, twelve hues around the
 * octave, and sized by the velocity. The glyph is drawn once per scene into
 * a small dynamic texture as shapes (head, stem, flag, beam), not a font
 * character: every machine draws the same note.
 *
 * Driven by: `BandSystem`, one spawn per hit it lets through. Read by: nobody.
 */
import { DynamicTexture, type Scene, type Vector3 } from '../libs/babylon/exports';
import { LiveList, acquireCard, additiveMaterial, fadeOut, hash, lerp, releaseCard, setCardCell, type Card, type RGB } from './core';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds a note floats before it is gone. */
const SECONDS = 1.5;

/** Card edge in tiles at full velocity: 30 cm, a glyph the size of a hand. */
const SIZE = 0.3;

/** The quietest note's share of that. */
const MIN_SIZE = 0.6;

/** Tiles per second the note rises. */
const RISE = 0.45;

/** Tiles per second it drifts sideways, one way or the other per note. */
const DRIFT = 0.12;

/** The sway on top of the drift: amplitude in tiles, rate in radians per second. */
const SWAY = 0.05;
const SWAY_RATE = 3;

/** Share of the life spent growing in from nothing. */
const GROW = 0.12;

/** Fade tail as a share of the life. */
const TAIL = 0.45;

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
}

const live = new LiveList();

/** The glyph sheet of the current scene; a map change disposes it with the pools. */
let sheetScene: Scene | null = null;
let sheet: DynamicTexture | null = null;

let seed = 0;

/** How many notes are floating (debug). */
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

/** The glyphs, white on black - the card is additive, black adds nothing. */
function drawSheet(tex: DynamicTexture): void {
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CELL * 2, CELL);
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
  sheet = new DynamicTexture('fx:bandNotes', { width: CELL * 2, height: CELL }, scene, true);
  sheet.hasAlpha = false;
  sheetScene = scene;
  drawSheet(sheet);
  return sheet;
}

function spawn(scene: Scene, at: Vector3, opts: BandNoteOptions): EffectHandle {
  const material = additiveMaterial(scene, sheetFor(scene), pitchColour(opts.pitch));
  const card: Card = acquireCard(scene, material);
  const s = seed++;
  setCardCell(card, CELLS, hash(s) < SINGLE_SHARE ? 0 : 1);
  const velocity = Math.max(0, Math.min(127, opts.velocity ?? 100)) / 127;
  const size = SIZE * lerp(MIN_SIZE, 1, velocity);
  const side = hash(s + 0.5) < 0.5 ? -1 : 1;
  const phase = hash(s + 0.25) * Math.PI * 2;
  const x = at.x, y = at.y, z = at.z;
  card.position.set(x, y, z);
  card.scaling.setAll(0);

  let t = 0;
  return live.push({
    update(dt) {
      t += dt;
      const p = t / SECONDS;
      if (p >= 1) return false;
      const grown = p < GROW ? p / GROW : 1;
      card.scaling.setAll(size * grown);
      card.visibility = fadeOut(p, TAIL);
      card.position.set(x + side * (DRIFT * t + SWAY * Math.sin(phase + SWAY_RATE * t)), y + RISE * t, z);
      return true;
    },
    release() {
      releaseCard(scene, card);
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
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
