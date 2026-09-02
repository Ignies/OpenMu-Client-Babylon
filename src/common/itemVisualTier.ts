import type { Item } from '../ecs/world';
import {
  capItemLevel,
  legacyItemEffectsOn,
  legacyRenderLevel,
} from './itemEffectMode';

/** Improved emissive scale while the legacy passes are also drawn ("Both"). */
const BOTH_SCALE = 0.65;
import { legacyItemColours, type LegacyItemColours } from './itemLegacyEffects';

/**
 * Item visual identity: a pure `(item) → ItemVisualTier` lookup
 * that every renderer consumes — the character's equipment, the hand, and
 * the ground drop all read the same descriptor, so a +13 blade glows, pulses
 * and lights the floor the same way wherever it is.
 *
 * Two looks share the descriptor (Options → Video → Item effects):
 *  - **legacy** — the original client's passes, reproduced in itemMaterial.ts
 *    from ZzzObject.cpp `RenderPartObjectEffect`; `legacy` carries the
 *    per-item chrome colours from its tables (itemLegacyEffects.ts).
 *  - **improved** — our own: GlowLayer halo + in-surface rim sheen, aura
 *    motes (itemAura.ts), energy arcs (itemCrackle.ts) and pooled lights, all
 *    in the item's legacy chrome colour (improvedColour):
 *      +0–6 none · +7–8 sheen · +9–10 pulse, motes, arcs, orbit ring, starts
 *      to emit light · +11–12 much denser: sparks, forked arcs, double ring ·
 *      +13–15 intense, a real light source. Every level from +9 is a visible
 *      step up from the one below so the level reads at a glance.
 *    Excellent layers a cyan↔green shimmer; ancient a deep green pulse.
 *
 * `level` is already capped by the original's render-level option, so both
 * looks obey the same "+Effect limitation" slider.
 */

export type ItemGlowTier = 0 | 1 | 2 | 3 | 4;

export type RGB = readonly [number, number, number];

export type ItemVisualTier = {
  /** Item level after the render-level cap (capItemLevel). */
  readonly level: number;
  readonly isExcellent: boolean;
  readonly isAncient: boolean;
  readonly sockets: number;
  readonly glow: ItemGlowTier;
  /** Base emissive tint; may exceed 1 — the ACES tone map handles it. */
  readonly emissive: RGB;
  /** Emissive strength at the pulse peak (0 = no level glow). */
  readonly intensity: number;
  /**
   * GlowLayer halo amplitude — deliberately a much gentler ladder than
   * `intensity`. The layer paints the *whole mesh silhouette* and blurs it,
   * so anything near the surface intensity floods the armor into one bright
   * shape and every texel of detail drowns (the "reflective blob"). The
   * halo stays a soft aura; the level reads through the crackle/aura
   * density, the pooled light and the in-surface sheen instead.
   */
  readonly halo: number;
  /** Fraction of `intensity` that breathes, and the breath rate (rad/s). */
  readonly pulse: number;
  readonly pulseRate: number;
  /** Pooled / terrain light gain (0 = not a light source). */
  readonly lightGain: number;
  readonly lightColor: RGB;
  /** Point-light range (tiles) and terrain stain radius (whole tiles). */
  readonly lightRange: number;
  readonly terrainRange: number;
  /** +11 and up shed sparks (itemAura.ts adds a fast falling layer). */
  readonly sparks: boolean;
  /** Aura particles per second (0 = no aura); itemAura.ts. */
  readonly auraRate: number;
  /** Energy arcs per second over the body from +9 (0 = none); itemCrackle.ts. */
  readonly crackleRate: number;
  /** Original-client pass colours for this item. */
  readonly legacy: LegacyItemColours;
  /** True when either look has something to draw for this item. */
  readonly active: boolean;
  /** True when the improved (emissive) look has something to draw. */
  readonly improvedActive: boolean;
};

const NONE: RGB = [0, 0, 0];

/**
 * Improved-look colour of an item: the original's chrome colour for it
 * (PartObjectColor — gold for most, blue for Legendary / Lightning, white for
 * Silver Bow…), so the halo, the motes and the floor light all agree with the
 * legacy passes. From +11 the PartObjectColor2 tint is mixed in, as the
 * original adds that pass on top. Normalised so the brightest channel is 1;
 * `intensity` carries the level.
 */
function improvedColour(legacy: LegacyItemColours, level: number): RGB {
  let [r, g, b] = legacy.chrome;

  if (level >= 11 && legacy.chrome2) {
    const [r2, g2, b2] = legacy.chrome2;
    r = r * 0.6 + r2 * 0.4;
    g = g * 0.6 + g2 * 0.4;
    b = b * 0.6 + b2 * 0.4;
  }

  const peak = Math.max(r, g, b, 0.001);

  return [r / peak, g / peak, b / peak];
}

/** Light source from +9: gain 0.3 at +9 scaling to 1.2 at +15. */
const LIGHT_FIRST_LEVEL = 9;
const LIGHT_GAIN_MIN = 0.3;
const LIGHT_GAIN_MAX = 1.2;

/** The original starts tinting at +3 (ZzzObject.cpp:10213). */
const LEGACY_FIRST_LEVEL = 3;

function glowTierOf(level: number): ItemGlowTier {
  if (level >= 13) return 4;
  if (level >= 11) return 3;
  if (level >= 9) return 2;
  if (level >= 7) return 1;
  return 0;
}

const tierCache = new Map<string, ItemVisualTier>();

/** Level (+0…+15), excellent, ancient and socket count → visual tier. */
export function itemVisualTier(item: Item | null | undefined): ItemVisualTier {
  const rawLevel = Math.max(0, Math.min(15, item?.lvl ?? 0));
  const level = capItemLevel(rawLevel);
  const isExcellent = item?.isExcellent === true;
  const isAncient = item?.isAncient === true;
  const sockets = Math.max(0, Math.min(5, item?.socketCount ?? 0));
  const group = item?.group ?? -1;
  const num = item?.num ?? -1;

  const key = `${group}:${num}|${level}|${isExcellent ? 1 : 0}|${
    isAncient ? 1 : 0
  }|${sockets}|${legacyRenderLevel()}`;
  const cached = tierCache.get(key);
  if (cached) return cached;

  const glow = glowTierOf(level);
  const legacy = legacyItemColours(group, num);
  const colour = improvedColour(legacy, level);

  let emissive: RGB = NONE;
  let intensity = 0;
  let halo = 0;
  let pulse = 0;
  let pulseRate = 0;

  let auraRate = 0;
  let crackleRate = 0;

  switch (glow) {
    case 1:
      emissive = colour;
      intensity = 0.35;
      halo = 0.18;
      pulse = 0.35;
      pulseRate = 2;
      break;
    case 2:
      // +9 / +10: the first "real" tier — clearly more than a sheen, with
      // a visible step between the two so the level reads at a glance.
      emissive = colour;
      intensity = level === 9 ? 1.1 : 1.3;
      halo = level === 9 ? 0.32 : 0.38;
      pulse = 0.45;
      pulseRate = 3;
      auraRate = level === 9 ? 18 : 24;
      crackleRate = level === 9 ? 4 : 5.5;
      break;
    case 3:
      // +11 / +12: dense motes, sparks, forked arcs and an orbit ring.
      emissive = colour;
      intensity = level === 11 ? 1.6 : 1.8;
      halo = level === 11 ? 0.48 : 0.54;
      pulse = 0.45;
      pulseRate = 3.5;
      auraRate = level === 11 ? 34 : 42;
      crackleRate = level === 11 ? 8 : 10;
      break;
    case 4:
      emissive = colour;
      intensity = 2.1 + (level - 13) * 0.3;
      halo = 0.62 + (level - 13) * 0.08;
      pulse = 0.4;
      pulseRate = 4;
      auraRate = 52 + (level - 13) * 8;
      crackleRate = 12 + (level - 13) * 2;
      break;
  }

  const lightGain =
    level >= LIGHT_FIRST_LEVEL
      ? LIGHT_GAIN_MIN +
        ((LIGHT_GAIN_MAX - LIGHT_GAIN_MIN) * (level - LIGHT_FIRST_LEVEL)) /
          (15 - LIGHT_FIRST_LEVEL)
      : 0;

  // At render level 0 the original skips the excellent / ancient passes too.
  const specials = legacyRenderLevel() > 0 && (isExcellent || isAncient);
  const improvedActive = intensity > 0 || specials || sockets > 0;

  // Excellent / ancient items twinkle even below +9.
  if (specials) auraRate += 6;

  const tier: ItemVisualTier = {
    level,
    isExcellent,
    isAncient,
    sockets,
    glow,
    emissive,
    intensity,
    halo,
    pulse,
    pulseRate,
    lightGain,
    lightColor: lightGain > 0 ? emissive : NONE,
    lightRange: lightGain > 0 ? 3 + ((level - LIGHT_FIRST_LEVEL) * 2) / 6 : 0,
    terrainRange: lightGain > 0 ? (level >= 13 ? 4 : level >= 11 ? 3 : 2) : 0,
    sparks: level >= 11,
    auraRate,
    crackleRate,
    legacy,
    active: improvedActive || level >= LEGACY_FIRST_LEVEL,
    improvedActive,
  };

  tierCache.set(key, tier);

  return tier;
}

/** The strongest tier across a set of equipped items (drives the body light). */
export function strongestTier(
  items: readonly (Item | null | undefined)[]
): ItemVisualTier {
  let best = itemVisualTier(null);

  for (const item of items) {
    if (!item) continue;
    const tier = itemVisualTier(item);
    if (
      tier.lightGain > best.lightGain ||
      (tier.lightGain === best.lightGain && tier.intensity > best.intensity) ||
      (tier.lightGain === best.lightGain &&
        tier.intensity === best.intensity &&
        tier.auraRate > best.auraRate)
    ) {
      best = tier;
    }
  }

  return best;
}

// --- shared clock -----------------------------------------------------------

let clock = 0;

/** World-time seconds; set once per frame by ItemGlowSystem. */
export function setItemGlowClock(seconds: number): void {
  clock = seconds;
}

export function itemGlowClock(): number {
  return clock;
}

// --- animated colours (improved look) ----------------------------------------

const EXC_A: RGB = [0.2, 0.9, 1]; // cyan
const EXC_B: RGB = [0.3, 1, 0.45]; // green
const EXC_GAIN = 0.4;
const EXC_RATE = 2.4;

const ANCIENT: RGB = [0.12, 0.65, 0.28];
const ANCIENT_BASE = 0.25;
const ANCIENT_PULSE = 0.3;
const ANCIENT_RATE = 1.8;

const SOCKET: RGB = [0.55, 0.75, 1];
const SOCKET_GAIN = 0.08;
const SOCKET_RATE = 5;

type ColorOut = { r: number; g: number; b: number };

/**
 * Emissive colour of a tier at `t` seconds. `out` is written in place (a
 * Babylon Color4 works — only r/g/b/a are touched).
 */
export function itemEmissiveAt<T extends ColorOut & { a?: number }>(
  tier: ItemVisualTier,
  t: number,
  out: T
): T {
  let r = 0;
  let g = 0;
  let b = 0;

  if (tier.intensity > 0) {
    const breath = 1 - tier.pulse * (0.5 - 0.5 * Math.sin(t * tier.pulseRate));
    const k = tier.intensity * breath;

    r += tier.emissive[0] * k;
    g += tier.emissive[1] * k;
    b += tier.emissive[2] * k;
  }

  const specials = legacyRenderLevel() > 0;

  if (tier.isExcellent && specials) {
    // The classic exc colour sweep: cyan ↔ green on the shared clock.
    const m = 0.5 + 0.5 * Math.sin(t * EXC_RATE);

    r += (EXC_A[0] + (EXC_B[0] - EXC_A[0]) * m) * EXC_GAIN;
    g += (EXC_A[1] + (EXC_B[1] - EXC_A[1]) * m) * EXC_GAIN;
    b += (EXC_A[2] + (EXC_B[2] - EXC_A[2]) * m) * EXC_GAIN;
  }

  if (tier.isAncient && specials) {
    const k =
      ANCIENT_BASE + ANCIENT_PULSE * (0.5 + 0.5 * Math.sin(t * ANCIENT_RATE));

    r += ANCIENT[0] * k;
    g += ANCIENT[1] * k;
    b += ANCIENT[2] * k;
  }

  if (tier.sockets > 0) {
    // Per-socket glint: a quick shimmer whose rate grows with the gem count.
    const k =
      SOCKET_GAIN *
      (0.5 + 0.5 * Math.sin(t * SOCKET_RATE * (1 + tier.sockets * 0.15)));

    r += SOCKET[0] * k;
    g += SOCKET[1] * k;
    b += SOCKET[2] * k;
  }

  // With the legacy wash underneath, the halo in the same colour doubles up.
  const k = legacyItemEffectsOn() ? BOTH_SCALE : 1;

  out.r = r * k;
  out.g = g * k;
  out.b = b * k;
  out.a = 1;

  return out;
}

/**
 * Colour handed to the GlowLayer's emissive selector: the tier tint at the
 * capped `halo` amplitude, breathing on the shared clock. Separate from
 * `itemEmissiveAt` on purpose — the layer floods the whole silhouette, so it
 * gets the soft-aura ladder while the surface sheen keeps the full ladder.
 * The excellent / ancient / socket shimmers ride along at half gain so their
 * colour still reads in the aura without re-flooding it.
 */
export function itemHaloAt<T extends ColorOut & { a?: number }>(
  tier: ItemVisualTier,
  t: number,
  out: T
): T {
  let r = 0;
  let g = 0;
  let b = 0;

  if (tier.halo > 0) {
    const breath = 1 - tier.pulse * (0.5 - 0.5 * Math.sin(t * tier.pulseRate));
    const k = tier.halo * breath;

    r += tier.emissive[0] * k;
    g += tier.emissive[1] * k;
    b += tier.emissive[2] * k;
  }

  const specials = legacyRenderLevel() > 0;

  if (tier.isExcellent && specials) {
    const m = 0.5 + 0.5 * Math.sin(t * EXC_RATE);
    const e = EXC_GAIN * 0.5;

    r += (EXC_A[0] + (EXC_B[0] - EXC_A[0]) * m) * e;
    g += (EXC_A[1] + (EXC_B[1] - EXC_A[1]) * m) * e;
    b += (EXC_A[2] + (EXC_B[2] - EXC_A[2]) * m) * e;
  }

  if (tier.isAncient && specials) {
    const k =
      (ANCIENT_BASE + ANCIENT_PULSE * (0.5 + 0.5 * Math.sin(t * ANCIENT_RATE))) *
      0.5;

    r += ANCIENT[0] * k;
    g += ANCIENT[1] * k;
    b += ANCIENT[2] * k;
  }

  if (tier.sockets > 0) {
    const k =
      SOCKET_GAIN *
      (0.5 + 0.5 * Math.sin(t * SOCKET_RATE * (1 + tier.sockets * 0.15)));

    r += SOCKET[0] * k;
    g += SOCKET[1] * k;
    b += SOCKET[2] * k;
  }

  const k = legacyItemEffectsOn() ? BOTH_SCALE : 1;

  out.r = r * k;
  out.g = g * k;
  out.b = b * k;
  out.a = 1;

  return out;
}

/**
 * Colour fed to the pooled point light / terrain stain: the level tint scaled
 * by the light gain, breathing with the emissive so floor and blade agree.
 */
export function itemLightColorAt(
  tier: ItemVisualTier,
  t: number,
  out: ColorOut
): ColorOut {
  if (tier.lightGain <= 0) {
    out.r = out.g = out.b = 0;
    return out;
  }

  const breath =
    1 - tier.pulse * 0.6 * (0.5 - 0.5 * Math.sin(t * tier.pulseRate));
  const k = tier.lightGain * breath;

  out.r = tier.lightColor[0] * k;
  out.g = tier.lightColor[1] * k;
  out.b = tier.lightColor[2] * k;

  if (tier.isExcellent && legacyRenderLevel() > 0) {
    const m = 0.5 + 0.5 * Math.sin(t * EXC_RATE);
    const e = 0.15 * tier.lightGain;

    out.r += (EXC_A[0] + (EXC_B[0] - EXC_A[0]) * m) * e;
    out.g += (EXC_A[1] + (EXC_B[1] - EXC_A[1]) * m) * e;
    out.b += (EXC_A[2] + (EXC_B[2] - EXC_A[2]) * m) * e;
  }

  return out;
}
